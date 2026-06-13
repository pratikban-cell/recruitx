from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from agents.candidate.graph import build_candidate_graph
from agents.negotiation.protocol import (
    FitScoreInput,
    any_dealbreaker_triggered,
    calculate_fit_score,
)
from agents.recruiter.graph import build_recruiter_graph
from api.auth import verify_negotiation_owner
from api.ws import manager
from db.client import get_db
from tasks.queue import dispatch_task

router = APIRouter(prefix="/api/negotiations", tags=["negotiations"])


async def run_negotiation_loop(negotiation_id: str):
    db = get_db()

    # 1. Fetch negotiation details
    neg_res = db.table("negotiations").select("*").eq("id", negotiation_id).execute()
    if not neg_res.data:
        return
    neg = neg_res.data[0]

    if neg.get("status") != "active":
        return

    # Check if takeover/paused mode is active
    if "paused" in (neg.get("candidate_notes") or "") or "paused" in (
        neg.get("recruiter_notes") or ""
    ):
        return

    # Fetch related candidate and recruiter profiles
    candidate_res = (
        db.table("candidates").select("*").eq("id", neg["candidate_id"]).execute()
    )
    recruiter_res = (
        db.table("recruiters").select("*").eq("id", neg["recruiter_id"]).execute()
    )

    if not candidate_res.data or not recruiter_res.data:
        return

    cand = dict(candidate_res.data[0])
    rec = dict(recruiter_res.data[0])

    # Parse candidate notes and recruiter notes for steering commands
    c_notes = neg.get("candidate_notes") or ""
    r_notes = neg.get("recruiter_notes") or ""

    cand_steering = None
    rec_steering = None
    import re

    c_steer_match = re.search(r"\[STEERING:\s*(.*?)\]", c_notes)
    if c_steer_match:
        cand_steering = c_steer_match.group(1)

    r_steer_match = re.search(r"\[STEERING:\s*(.*?)\]", r_notes)
    if r_steer_match:
        rec_steering = r_steer_match.group(1)

    # Relational candidate_configs checks with seamless pipe-delimited fallback
    try:
        cand_cfg_res = (
            db.table("candidate_configs")
            .select("*")
            .eq("candidate_id", cand["id"])
            .execute()
        )
        if cand_cfg_res.data:
            cand_cfg = cand_cfg_res.data[0]
            cand["equity_demand_threshold"] = cand_cfg.get("equity_demand_threshold")
            cand["negotiation_style"] = (
                cand_cfg.get("negotiation_style") or "collaborative"
            )
            cand["bio"] = cand_cfg.get("bio") or cand.get("bio") or ""
        else:
            raise Exception("No candidate config found, fallback")
    except Exception:
        # Deserialize candidate availability fallback properties
        availability_str = cand.get("availability") or ""
        if "|" in availability_str:
            parts = availability_str.split("|")
            cand["availability"] = parts[0]
            for p in parts[1:]:
                if ":" in p:
                    k, v = p.split(":", 1)
                    if k == "equity_demand_threshold":
                        cand["equity_demand_threshold"] = int(v) if v else None
                    elif k == "negotiation_style":
                        cand["negotiation_style"] = v
                    elif k == "bio":
                        import urllib.parse

                        try:
                            cand["bio"] = urllib.parse.unquote(v)
                        except Exception:
                            cand["bio"] = v
        else:
            cand["equity_demand_threshold"] = None
            cand["negotiation_style"] = "collaborative"
            cand["bio"] = cand.get("bio") or ""

    # Relational recruiter_configs checks with seamless pipe-delimited fallback
    try:
        rec_cfg_res = (
            db.table("recruiter_configs")
            .select("*")
            .eq("recruiter_id", rec["id"])
            .execute()
        )
        if rec_cfg_res.data:
            rec_cfg = rec_cfg_res.data[0]
            rec["max_salary_flex"] = rec_cfg.get("max_salary_flex")
            rec["recruiter_negotiation_style"] = (
                rec_cfg.get("recruiter_negotiation_style") or "collaborative"
            )
            rec["negotiation_style"] = rec["recruiter_negotiation_style"]
            rec["dealbreaker_salary"] = bool(rec_cfg.get("dealbreaker_salary"))
            rec["dealbreaker_skills"] = bool(rec_cfg.get("dealbreaker_skills"))
            rec["dealbreaker_remote"] = bool(rec_cfg.get("dealbreaker_remote"))
        else:
            raise Exception("No recruiter config found, fallback")
    except Exception:
        # Deserialize recruiter remote_policy fallback properties
        remote_policy_str = rec.get("remote_policy") or ""
        rec["dealbreaker_salary"] = False
        rec["dealbreaker_skills"] = False
        rec["dealbreaker_remote"] = False
        if "|" in remote_policy_str:
            parts = remote_policy_str.split("|")
            rec["remote_policy"] = parts[0]
            for p in parts[1:]:
                if ":" in p:
                    k, v = p.split(":", 1)
                    if k == "max_salary_flex":
                        rec["max_salary_flex"] = int(v) if v else None
                    elif k == "recruiter_negotiation_style":
                        rec["recruiter_negotiation_style"] = v
                        rec["negotiation_style"] = v
                    elif k == "dealbreaker_salary":
                        rec["dealbreaker_salary"] = v == "true"
                    elif k == "dealbreaker_skills":
                        rec["dealbreaker_skills"] = v == "true"
                    elif k == "dealbreaker_remote":
                        rec["dealbreaker_remote"] = v == "true"
        else:
            rec["max_salary_flex"] = None
            rec["recruiter_negotiation_style"] = "collaborative"
            rec["negotiation_style"] = "collaborative"

    cand["steering_instruction"] = cand_steering
    rec["steering_instruction"] = rec_steering

    # Fetch candidate name from profiles
    try:
        profile_res = (
            db.table("profiles").select("name").eq("id", cand["profile_id"]).execute()
        )
        if profile_res.data:
            cand["name"] = profile_res.data[0].get("name") or "the Candidate"
    except Exception as e:
        print("Failed to enrich candidate profile name:", e)

    # Dynamically override recruiter details if a job_id is associated in candidate_notes
    notes = neg.get("candidate_notes") or ""
    import re

    match = re.search(r"([a-f0-9\-]{36})", notes)
    if match:
        job_id = match.group(1)
        job_res = db.table("jobs").select("*").eq("id", job_id).execute()
        if job_res.data:
            job = job_res.data[0]
            rec = dict(rec)
            rec["position"] = job.get("title") or rec.get("position")
            rec["company"] = job.get("company") or rec.get("company")
            rec["salary_range_min"] = (
                job.get("salary_min")
                if job.get("salary_min") is not None
                else rec.get("salary_range_min")
            )
            rec["salary_range_max"] = (
                job.get("salary_max")
                if job.get("salary_max") is not None
                else rec.get("salary_range_max")
            )
            rec["must_haves"] = (
                job.get("stack")
                if job.get("stack") is not None
                else rec.get("must_haves")
            )

    # Initialize states and calculate fit score
    skills_dict = {s: "verified" for s in (cand.get("skills") or [])}
    reqs_dict = {s: "required" for s in (rec.get("must_haves") or [])}

    # Dynamically build recruiter dealbreakers based on guardrail toggles
    recruiter_dbs = list(rec.get("dealbreakers") or [])
    if rec.get("dealbreaker_skills"):
        for skill in rec.get("must_haves") or []:
            recruiter_dbs.append(f"must have {skill}")

    if rec.get("dealbreaker_remote"):
        policy = (rec.get("remote_policy") or "remote").lower()
        if "remote" in policy:
            recruiter_dbs.append("no onsite")
        else:
            recruiter_dbs.append("no remote")

    # Salary Ceiling enforcement:
    # If style is stubborn, we absolutely do not flex. The ceiling is strictly salary_range_max.
    # Otherwise, if we have a max_salary_flex, we can use that as the ceiling.
    salary_ceiling = rec.get("salary_range_max")
    style = rec.get("recruiter_negotiation_style") or "collaborative"
    if style != "stubborn" and rec.get("max_salary_flex") is not None:
        salary_ceiling = rec["max_salary_flex"]

    if rec.get("dealbreaker_salary"):
        recruiter_dbs.append("salary limit")

    fit_input = FitScoreInput(
        candidate_verified_skills=skills_dict,
        candidate_salary_min=cand.get("salary_min"),
        candidate_salary_target=None,
        candidate_dealbreakers=cand.get("dealbreakers") or [],
        candidate_priorities=["remote"] if cand.get("remote_pref") else [],
        recruiter_requirements=reqs_dict,
        recruiter_salary_ceiling=salary_ceiling,
        recruiter_salary_budget=rec.get("salary_range_min"),
        recruiter_must_haves=rec.get("must_haves") or [],
        recruiter_dealbreakers=recruiter_dbs,
    )

    fit_score = calculate_fit_score(fit_input)
    db.table("negotiations").update({"fit_score": int(round(fit_score * 100))}).eq(
        "id", negotiation_id
    ).execute()

    # 2. Check for initial dealbreakers
    if any_dealbreaker_triggered(fit_input):
        sys_msg = "Negotiation terminated: critical dealbreaker triggered (mismatch in requirements or salary floor)."
        msg_id = str(uuid.uuid4())
        db.table("messages").insert(
            {
                "id": msg_id,
                "negotiation_id": negotiation_id,
                "sender_role": "system",
                "content": sys_msg,
            }
        ).execute()

        db.table("negotiations").update({"status": "rejected"}).eq(
            "id", negotiation_id
        ).execute()

        await manager.broadcast(
            negotiation_id,
            {
                "id": msg_id,
                "sender_role": "system",
                "content": sys_msg,
                "type": "STATUS_TRANSITION",
                "status": "rejected",
            },
        )
        return

    # 3. Start A2A Loop
    recruiter_graph = build_recruiter_graph()
    candidate_graph = build_candidate_graph()

    msgs_res = (
        db.table("messages")
        .select("*")
        .eq("negotiation_id", negotiation_id)
        .order("created_at")
        .execute()
    )
    messages = msgs_res.data or []

    if not messages:
        # Recruiter agent initiates
        initial_prompt = f"Negotiation start: Candidate profile {cand.get('title')} matching job for position {rec.get('position')} at {rec.get('company')}."
        rec_state = {
            "user_id": negotiation_id,
            "role_profile": rec,
            "company_profile": rec,
            "candidate_pipeline": [],
            "active_negotiations": [],
            "shortlist": [],
            "scheduled_interviews": [],
            "fit_score": fit_score,
            "messages": [{"role": "system", "content": initial_prompt}],
            "current_task": "negotiate",
            "candidate_profile": cand,
        }
        res = await recruiter_graph.ainvoke(
            rec_state, config={"configurable": {"thread_id": negotiation_id}}
        )
        rec_replies = res.get("messages", [])
        rec_reply = (
            rec_replies[-1]["content"]
            if rec_replies
            else "Hello! Let's discuss this role."
        )

        msg_id = str(uuid.uuid4())
        db.table("messages").insert(
            {
                "id": msg_id,
                "negotiation_id": negotiation_id,
                "sender_role": "recruiter",
                "content": rec_reply,
            }
        ).execute()

        await manager.broadcast(
            negotiation_id,
            {"id": msg_id, "sender_role": "recruiter", "content": rec_reply},
        )

        msgs_res = (
            db.table("messages")
            .select("*")
            .eq("negotiation_id", negotiation_id)
            .order("created_at")
            .execute()
        )
        messages = msgs_res.data or []

    cand_agreed = False
    rec_agreed = False
    has_impasse = False

    for turn in range(10):
        last_msg = messages[-1]

        if last_msg["sender_role"] == "recruiter":
            cand_history = []
            for m in messages:
                role = "system"
                if m["sender_role"] == "recruiter":
                    role = "recruiter_agent"
                elif m["sender_role"] == "candidate":
                    role = "candidate_agent"
                cand_history.append({"role": role, "content": m["content"]})

            cand_state = {
                "user_id": negotiation_id,
                "profile": cand,
                "verified_skills": skills_dict,
                "preferences": {"remote": cand.get("remote_pref", True)},
                "dealbreakers": cand.get("dealbreakers") or [],
                "salary_floor": cand.get("salary_min"),
                "salary_target": cand.get("salary_min"),
                "fit_score": fit_score,
                "active_negotiations": [],
                "matches": [],
                "scheduled_meetings": [],
                "escalations": [],
                "messages": cand_history,
                "current_task": "negotiate",
            }
            res = await candidate_graph.ainvoke(
                cand_state, config={"configurable": {"thread_id": negotiation_id}}
            )
            cand_replies = res.get("messages", [])
            cand_reply = (
                cand_replies[-1]["content"]
                if cand_replies
                else "I am interested in this opportunity."
            )

            # Check signals
            is_impasse = "[IMPASSE]" in cand_reply
            is_agreed = "[AGREED]" in cand_reply

            cand_reply_clean = (
                cand_reply.replace("[AGREED]", "").replace("[IMPASSE]", "").strip()
            )

            if is_impasse:
                has_impasse = True
                fit_score = 0.0
                db.table("negotiations").update({"fit_score": 0}).eq(
                    "id", negotiation_id
                ).execute()

            msg_id = str(uuid.uuid4())
            db.table("messages").insert(
                {
                    "id": msg_id,
                    "negotiation_id": negotiation_id,
                    "sender_role": "candidate",
                    "content": cand_reply_clean,
                }
            ).execute()
            await manager.broadcast(
                negotiation_id,
                {"id": msg_id, "sender_role": "candidate", "content": cand_reply_clean},
            )

            if is_impasse:
                break

            cand_agreed = is_agreed
            if cand_agreed and rec_agreed:
                break

        elif last_msg["sender_role"] == "candidate":
            rec_history = []
            for m in messages:
                role = "system"
                if m["sender_role"] == "recruiter":
                    role = "recruiter_agent"
                elif m["sender_role"] == "candidate":
                    role = "candidate_agent"
                rec_history.append({"role": role, "content": m["content"]})

            rec_state = {
                "user_id": negotiation_id,
                "role_profile": rec,
                "company_profile": rec,
                "candidate_pipeline": [],
                "active_negotiations": [],
                "shortlist": [],
                "scheduled_interviews": [],
                "fit_score": fit_score,
                "messages": rec_history,
                "current_task": "negotiate",
                "candidate_profile": cand,
            }
            res = await recruiter_graph.ainvoke(
                rec_state, config={"configurable": {"thread_id": negotiation_id}}
            )
            rec_replies = res.get("messages", [])
            rec_reply = (
                rec_replies[-1]["content"]
                if rec_replies
                else "Thank you for the response."
            )

            # Check signals
            is_impasse = "[IMPASSE]" in rec_reply
            is_agreed = "[AGREED]" in rec_reply

            rec_reply_clean = (
                rec_reply.replace("[AGREED]", "").replace("[IMPASSE]", "").strip()
            )

            if is_impasse:
                has_impasse = True
                fit_score = 0.0
                db.table("negotiations").update({"fit_score": 0}).eq(
                    "id", negotiation_id
                ).execute()

            msg_id = str(uuid.uuid4())
            db.table("messages").insert(
                {
                    "id": msg_id,
                    "negotiation_id": negotiation_id,
                    "sender_role": "recruiter",
                    "content": rec_reply_clean,
                }
            ).execute()
            await manager.broadcast(
                negotiation_id,
                {"id": msg_id, "sender_role": "recruiter", "content": rec_reply_clean},
            )

            if is_impasse:
                break

            rec_agreed = is_agreed
            if cand_agreed and rec_agreed:
                break

        msgs_res = (
            db.table("messages")
            .select("*")
            .eq("negotiation_id", negotiation_id)
            .order("created_at")
            .execute()
        )
        messages = msgs_res.data or []

    # Helper to schedule calendar meeting
    async def schedule_calendar_interview(
        negotiation_id: str, cand_profile_id: str, rec_profile_id: str
    ) -> Optional[dict]:
        db = get_db()
        from api.calendar import refresh_access_token

        try:
            cand_token = await refresh_access_token(cand_profile_id)
            rec_token = await refresh_access_token(rec_profile_id)
        except Exception:
            return None

        # Query connections
        cand_conn_res = (
            db.table("calendar_connections")
            .select("*")
            .eq("profile_id", cand_profile_id)
            .execute()
        )
        rec_conn_res = (
            db.table("calendar_connections")
            .select("*")
            .eq("profile_id", rec_profile_id)
            .execute()
        )

        if (
            not cand_conn_res.data
            or not rec_conn_res.data
            or not cand_token
            or not rec_token
        ):
            return None

        cand_email = cand_conn_res.data[0]["email"] or "candidate@recruitx.ai"
        rec_email = rec_conn_res.data[0]["email"] or "recruiter@recruitx.ai"

        is_mock = cand_token == "mock_access_token" or rec_token == "mock_access_token"

        target_dt = datetime.now(timezone.utc) + timedelta(days=2)
        target_dt = target_dt.replace(hour=14, minute=0, second=0, microsecond=0)

        meet_link = "https://meet.google.com/abc-mock-meet"
        start_str = target_dt.isoformat()
        end_str = (target_dt + timedelta(minutes=45)).isoformat()

        if is_mock:
            return {
                "start": start_str,
                "end": end_str,
                "meet_link": meet_link,
                "cand_email": cand_email,
                "rec_email": rec_email,
                "mock": True,
            }

        try:
            async with httpx.AsyncClient() as client:
                time_min = datetime.now(timezone.utc).isoformat()
                time_max = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()

                # Fetch availability
                rec_fb = await client.post(
                    "https://www.googleapis.com/calendar/v3/freeBusy",
                    headers={"Authorization": f"Bearer {rec_token}"},
                    json={
                        "timeMin": time_min,
                        "timeMax": time_max,
                        "items": [{"id": "primary"}],
                    },
                )
                cand_fb = await client.post(
                    "https://www.googleapis.com/calendar/v3/freeBusy",
                    headers={"Authorization": f"Bearer {cand_token}"},
                    json={
                        "timeMin": time_min,
                        "timeMax": time_max,
                        "items": [{"id": "primary"}],
                    },
                )

                rec_busy = (
                    rec_fb.json()
                    .get("calendars", {})
                    .get("primary", {})
                    .get("busy", [])
                    if rec_fb.status_code == 200
                    else []
                )
                cand_busy = (
                    cand_fb.json()
                    .get("calendars", {})
                    .get("primary", {})
                    .get("busy", [])
                    if cand_fb.status_code == 200
                    else []
                )
                all_busy = rec_busy + cand_busy

                chosen_start = None
                for day in range(1, 4):
                    scan_date = datetime.now(timezone.utc) + timedelta(days=day)
                    for hour in [10, 11, 14, 15]:
                        slot_start = scan_date.replace(
                            hour=hour, minute=0, second=0, microsecond=0
                        )
                        slot_end = slot_start + timedelta(minutes=45)

                        overlap = False
                        for b in all_busy:
                            b_start = datetime.fromisoformat(
                                b["start"].replace("Z", "+00:00")
                            )
                            b_end = datetime.fromisoformat(
                                b["end"].replace("Z", "+00:00")
                            )
                            if not (slot_end <= b_start or slot_start >= b_end):
                                overlap = True
                                break
                        if not overlap:
                            chosen_start = slot_start
                            break
                    if chosen_start:
                        break

                if chosen_start:
                    start_str = chosen_start.isoformat()
                    end_str = (chosen_start + timedelta(minutes=45)).isoformat()

                # Create Google Calendar Event
                event_body = {
                    "summary": "recruitx Match Interview",
                    "description": f"Interview scheduled dynamically by Candidate & Recruiter AI agents.\nNegotiation Ref: {negotiation_id}",
                    "start": {"dateTime": start_str},
                    "end": {"dateTime": end_str},
                    "attendees": [{"email": rec_email}, {"email": cand_email}],
                    "conferenceData": {
                        "createRequest": {
                            "requestId": str(uuid.uuid4()),
                            "conferenceSolutionKey": {"type": "hangoutsMeet"},
                        }
                    },
                }

                create_resp = await client.post(
                    "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
                    headers={"Authorization": f"Bearer {rec_token}"},
                    json=event_body,
                )

                if create_resp.status_code in [200, 201]:
                    evt = create_resp.json()
                    meet_link = (
                        evt.get("hangoutLink")
                        or evt.get("conferenceData", {})
                        .get("entryPoints", [{}])[0]
                        .get("uri")
                        or meet_link
                    )

            return {
                "start": start_str,
                "end": end_str,
                "meet_link": meet_link,
                "cand_email": cand_email,
                "rec_email": rec_email,
                "mock": False,
            }
        except Exception:
            return {
                "start": start_str,
                "end": end_str,
                "meet_link": meet_link,
                "cand_email": cand_email,
                "rec_email": rec_email,
                "mock": True,
            }

    # Final Wrap Up
    consensus_reached = cand_agreed and rec_agreed
    if not consensus_reached and not has_impasse:
        try:
            import os

            from openai import OpenAI

            client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
            chat_summary = "\n".join(
                [
                    f"{m.get('sender_role')}: {m.get('content')}"
                    for m in messages
                    if m.get("sender_role") in ["candidate", "recruiter"]
                ]
            )
            check_prompt = (
                "You are an expert arbitrator analyzing a negotiation transcript between a candidate's AI agent and a recruiter's AI agent.\n"
                "Determine if they successfully reached a mutual consensus/agreement on the salary and key terms (e.g. both parties explicitly agreed or accepted the offer/proposal, or welcomed each other aboard showing a done deal).\n"
                "Answer with exactly 'YES' if they agreed, or 'NO' if they did not agree, hit an impasse, or ran out of turns without a clear consensus.\n\n"
                f"Transcript:\n{chat_summary}\n\n"
                "Agreement reached (YES/NO):"
            )
            chk_resp = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": check_prompt}],
                max_tokens=5,
                temperature=0.0,
            )
            decision = (chk_resp.choices[0].message.content or "").strip().upper()
            if "YES" in decision:
                consensus_reached = True
        except Exception as e:
            print("Failed to run consensus check LLM:", e)

    if consensus_reached or (fit_score >= 0.60 and not has_impasse):
        cal_details = await schedule_calendar_interview(
            negotiation_id, cand.get("profile_id"), rec.get("profile_id")
        )
        if cal_details:
            meeting_time = datetime.fromisoformat(
                cal_details["start"].replace("Z", "+00:00")
            ).strftime("%A, %B %d at %I:%M %p UTC")
            meet_link = cal_details["meet_link"]
            sys_msg = (
                f"Negotiation successful: core requirements aligned. Candidate and Recruiter agents have scheduled an interview "
                f"for {meeting_time}. Google Meet video link: {meet_link}"
            )
            # Notify both parties of booked meeting
            dispatch_task(
                None,
                "notify_meeting_booked",
                negotiation_id=negotiation_id,
                meeting_time=meeting_time,
                meet_link=meet_link,
            )
        else:
            sys_msg = (
                "Negotiation successful: core requirements aligned. Candidate and Recruiter agents have marked this as scheduled. "
                "Note: Connect your Google Calendar in Settings to automatically generate video meeting links."
            )
        db.table("negotiations").update({"status": "scheduled"}).eq(
            "id", negotiation_id
        ).execute()
    else:
        sys_msg = "Negotiation completed: agents could not reach a final agreement."
        db.table("negotiations").update({"status": "completed"}).eq(
            "id", negotiation_id
        ).execute()

    msg_id = str(uuid.uuid4())
    db.table("messages").insert(
        {
            "id": msg_id,
            "negotiation_id": negotiation_id,
            "sender_role": "system",
            "content": sys_msg,
        }
    ).execute()

    await manager.broadcast(
        negotiation_id,
        {
            "id": msg_id,
            "sender_role": "system",
            "content": sys_msg,
            "type": "STATUS_TRANSITION",
            "status": "scheduled"
            if (consensus_reached or (fit_score >= 0.60 and not has_impasse))
            else "completed",
        },
    )


@router.post("/{negotiation_id}/run")
async def trigger_negotiation(
    negotiation_id: str,
    background_tasks: BackgroundTasks,
    user=Depends(verify_negotiation_owner),
):
    dispatch_task(
        background_tasks, "run_negotiation_loop", negotiation_id=negotiation_id
    )
    return {"status": "started", "negotiation_id": negotiation_id}


@router.post("/{negotiation_id}/pause")
async def pause_negotiation(
    negotiation_id: str,
    payload: dict,
    background_tasks: BackgroundTasks,
    user=Depends(verify_negotiation_owner),
):
    role = payload.get("role", "candidate")
    db = get_db()

    neg_res = db.table("negotiations").select("*").eq("id", negotiation_id).execute()
    if not neg_res.data:
        raise HTTPException(status_code=404, detail="Negotiation not found")
    neg = neg_res.data[0]

    update_field = "candidate_notes" if role == "candidate" else "recruiter_notes"
    current_val = neg.get(update_field) or ""
    if "paused" not in current_val:
        new_val = (current_val + " paused").strip()
        db.table("negotiations").update({update_field: new_val}).eq(
            "id", negotiation_id
        ).execute()

    msg_id = str(uuid.uuid4())
    sys_msg = f"Manual takeover active: Agent paused by human {role}."
    db.table("messages").insert(
        {
            "id": msg_id,
            "negotiation_id": negotiation_id,
            "sender_role": "system",
            "content": sys_msg,
        }
    ).execute()

    await manager.broadcast(
        negotiation_id, {"id": msg_id, "sender_role": "system", "content": sys_msg}
    )

    dispatch_task(
        background_tasks,
        "notify_takeover_paused",
        negotiation_id=negotiation_id,
        paused_by_role=role,
    )

    return {"status": "paused"}


@router.post("/{negotiation_id}/resume")
async def resume_negotiation(
    negotiation_id: str,
    background_tasks: BackgroundTasks,
    user=Depends(verify_negotiation_owner),
):
    db = get_db()

    neg_res = db.table("negotiations").select("*").eq("id", negotiation_id).execute()
    if not neg_res.data:
        raise HTTPException(status_code=404, detail="Negotiation not found")
    neg = neg_res.data[0]

    c_notes = (neg.get("candidate_notes") or "").replace("paused", "").strip()
    r_notes = (neg.get("recruiter_notes") or "").replace("paused", "").strip()

    db.table("negotiations").update(
        {"candidate_notes": c_notes, "recruiter_notes": r_notes}
    ).eq("id", negotiation_id).execute()

    msg_id = str(uuid.uuid4())
    sys_msg = "Agent resumed. AI negotiation active."
    db.table("messages").insert(
        {
            "id": msg_id,
            "negotiation_id": negotiation_id,
            "sender_role": "system",
            "content": sys_msg,
        }
    ).execute()

    await manager.broadcast(
        negotiation_id, {"id": msg_id, "sender_role": "system", "content": sys_msg}
    )

    dispatch_task(
        background_tasks, "run_negotiation_loop", negotiation_id=negotiation_id
    )
    return {"status": "resumed"}


@router.post("/{negotiation_id}/steer")
async def steer_negotiation(
    negotiation_id: str,
    payload: dict,
    background_tasks: BackgroundTasks,
    user=Depends(verify_negotiation_owner),
):
    instruction = payload.get("instruction")
    role = payload.get("role", "recruiter")

    if not instruction:
        raise HTTPException(status_code=400, detail="Missing steering instruction")

    db = get_db()

    neg_res = db.table("negotiations").select("*").eq("id", negotiation_id).execute()
    if not neg_res.data:
        raise HTTPException(status_code=404, detail="Negotiation not found")
    neg = neg_res.data[0]

    update_field = "candidate_notes" if role == "candidate" else "recruiter_notes"
    current_val = neg.get(update_field) or ""

    import re

    cleaned_val = re.sub(r"\[STEERING:\s*.*?\]", "", current_val).strip()

    new_steer = f"[STEERING: {instruction}]"
    final_val = f"{cleaned_val} {new_steer}".strip()

    db.table("negotiations").update({update_field: final_val}).eq(
        "id", negotiation_id
    ).execute()

    msg_id = str(uuid.uuid4())
    sys_msg = f"Tactical co-pilot guidance received: {role.capitalize()} agent instructed to '{instruction}'."
    db.table("messages").insert(
        {
            "id": msg_id,
            "negotiation_id": negotiation_id,
            "sender_role": "system",
            "content": sys_msg,
        }
    ).execute()

    await manager.broadcast(
        negotiation_id, {"id": msg_id, "sender_role": "system", "content": sys_msg}
    )

    dispatch_task(
        background_tasks, "run_negotiation_loop", negotiation_id=negotiation_id
    )

    return {"status": "steered", "instruction": instruction, "role": role}


@router.post("/{negotiation_id}/status")
async def update_negotiation_status(
    negotiation_id: str,
    payload: dict,
    background_tasks: BackgroundTasks,
    user=Depends(verify_negotiation_owner),
):
    new_status = payload.get("status")
    if new_status not in ["active", "matched", "scheduled", "completed", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid negotiation status")

    db = get_db()

    # Fetch negotiation
    neg_res = db.table("negotiations").select("*").eq("id", negotiation_id).execute()
    if not neg_res.data:
        raise HTTPException(status_code=404, detail="Negotiation not found")
    neg = neg_res.data[0]

    # Check if there is an actual transition/change
    old_status = neg.get("status")
    if old_status == new_status:
        return {"status": "unchanged", "negotiation_id": negotiation_id}

    # Update negotiations status
    db.table("negotiations").update({"status": new_status}).eq(
        "id", negotiation_id
    ).execute()

    # Broadcast a system log message in the chat
    msg_id = str(uuid.uuid4())
    status_display = {
        "matched": "Selected & Hired",
        "rejected": "Rejected",
        "completed": "Interview Finished",
        "scheduled": "Interview Scheduled",
        "active": "Active Negotiation",
    }.get(new_status, new_status)

    sys_msg = f"Status updated by recruiter: {status_display}."
    db.table("messages").insert(
        {
            "id": msg_id,
            "negotiation_id": negotiation_id,
            "sender_role": "system",
            "content": sys_msg,
        }
    ).execute()

    await manager.broadcast(
        negotiation_id,
        {
            "id": msg_id,
            "sender_role": "system",
            "content": sys_msg,
            "type": "STATUS_TRANSITION",
            "status": new_status,
        },
    )

    # Parse matching job_id from candidate_notes using regex pattern
    notes = neg.get("candidate_notes") or ""
    import re

    match = re.search(r"([a-f0-9\-]{36})", notes)
    if match:
        job_id = match.group(1)

        # If job_id is found, update the corresponding applications table status
        app_status = None
        if new_status == "matched":
            app_status = "accepted"
        elif new_status == "rejected":
            app_status = "rejected"

        if app_status:
            try:
                db.table("applications").update({"status": app_status}).eq(
                    "job_id", job_id
                ).eq("candidate_id", neg["candidate_id"]).execute()
            except Exception as app_err:
                print("Failed to update application status:", app_err)

        # If status is updated to 'matched' (Selected & Hired), update jobs table status to 'filled'
        if new_status == "matched":
            try:
                db.table("jobs").update({"status": "filled"}).eq("id", job_id).execute()
            except Exception as job_err:
                print("Failed to update job status to filled:", job_err)

    return {
        "status": "updated",
        "negotiation_id": negotiation_id,
        "new_status": new_status,
    }


@router.get("/{negotiation_id}/interview-kit")
async def get_interview_kit(
    negotiation_id: str,
    user=Depends(verify_negotiation_owner),
):
    db = get_db()
    
    # 1. Fetch negotiation details
    neg_res = (
        db.table("negotiations")
        .select("*, candidate:candidates(*), recruiter:recruiters(*)")
        .eq("id", negotiation_id)
        .single()
        .execute()
    )
    if not neg_res.data:
        raise HTTPException(status_code=404, detail="Negotiation not found")
    neg = neg_res.data

    # 2. Fetch transcript messages
    msg_res = (
        db.table("messages")
        .select("*")
        .eq("negotiation_id", negotiation_id)
        .order("created_at")
        .execute()
    )
    messages = msg_res.data or []

    transcript = ""
    for m in messages:
        sender = (
            "Candidate Agent"
            if m["sender_role"] == "candidate"
            else ("Recruiter Agent" if m["sender_role"] == "recruiter" else "System")
        )
        transcript += f"{sender}: {m['content']}\n"

    # 3. Call OpenAI to generate translation brief and interview questions
    import os
    from openai import OpenAI

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")

    client = OpenAI(api_key=api_key)

    cand_title = neg["candidate"]["title"] if neg.get("candidate") else "Software Engineer"
    cand_skills = ", ".join(neg["candidate"]["skills"]) if neg.get("candidate") and neg["candidate"].get("skills") else "N/A"
    company_name = neg["recruiter"]["company"] if neg.get("recruiter") else "Leapfrog"
    must_haves = ", ".join(neg["recruiter"]["must_haves"]) if neg.get("recruiter") and neg["recruiter"].get("must_haves") else "N/A"

    system_prompt = """You are an elite AI technical talent strategist. Analyze this negotiation transcript between the Candidate Agent and the Recruiter Agent.
Generate a high-fidelity HR Translation Brief and a structured Technical Interview Kit.

The response MUST be a single valid JSON object with the following structure:
{
  "translation_brief": "A plain English executive summary (max 120 words) describing the candidate's core competency level, direct fit for this company, and communication style.",
  "verified_skills_highlight": [
    {
      "skill": "Python",
      "evidence": "How this was demonstrated, e.g. 'Has 12 active repos with FastAPI, demonstrated strong async patterns in negotiation.'"
    }
  ],
  "unverified_skills_probe": [
    "List of 1-3 skills that were claimed but not fully verified or need testing in-person"
  ],
  "interview_questions": [
    {
      "question": "The actual target interview question to ask.",
      "expected_signals": "Keywords, design concepts, or technical terms a strong candidate will include in their answer.",
      "weak_signals": "Red flags or shallow answers to look out for.",
      "suggested_follow_up": "A quick follow-up probe."
    }
  ]
}

Return ONLY the raw JSON. Do not wrap in markdown or block code. Ensure all quotes are properly escaped.
"""

    user_content = f"""
Candidate Title: {cand_title}
Candidate Skills: {cand_skills}
Recruiter Company: {company_name}
Must Have Stack: {must_haves}

Negotiation Transcript:
{transcript}
"""

    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
        )
        result_str = resp.choices[0].message.content or "{}"
        return json.loads(result_str)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to generate interview kit: {str(e)}"
        )

