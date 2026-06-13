from __future__ import annotations

import json

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from agents.recruiter.graph import build_recruiter_graph
from api.auth import assert_profile_owner, assert_recruiter_owner, assert_negotiation_participant, get_current_user
from db.client import get_db
from tasks.queue import dispatch_task

router = APIRouter(prefix="/api/recruiters", tags=["recruiters"])


@router.post("/activate")
async def activate_recruiter(
    payload: dict,
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user),
):
    profile_id = payload.get("profile_id")
    raw_bio = payload.get("bio")

    if not profile_id or not raw_bio:
        raise HTTPException(status_code=400, detail="Missing profile_id or bio")

    assert_profile_owner(profile_id, user)

    db = get_db()

    # Fetch recruiter
    rec_res = db.table("recruiters").select("*").eq("profile_id", profile_id).execute()
    if not rec_res.data:
        raise HTTPException(status_code=404, detail="Recruiter profile not found")
    rec = rec_res.data[0]

    # Run LangGraph recruiter profile builder node
    recruiter_graph = build_recruiter_graph()

    state = {
        "user_id": rec["id"],
        "role_profile": {"raw_input": raw_bio},
        "company_profile": {},
        "candidate_pipeline": [],
        "active_negotiations": [],
        "shortlist": [],
        "scheduled_interviews": [],
        "fit_score": 0.0,
        "messages": [],
        "current_task": "analyze",
    }

    # Invoke LangGraph builder (first step or whole graph)
    res = await recruiter_graph.ainvoke(
        state, config={"configurable": {"thread_id": rec["id"]}}
    )

    parsed_profile = res.get("role_profile") or {}

    # Save the parsed data to the recruiters table
    update_data = {
        "position": parsed_profile.get("title") or rec.get("position"),
        "salary_range_min": parsed_profile.get("salary_budget")
        or rec.get("salary_range_min"),
        "salary_range_max": parsed_profile.get("salary_ceiling")
        or rec.get("salary_range_max"),
        "must_haves": parsed_profile.get("must_haves")
        or parsed_profile.get("required_skills")
        or rec.get("must_haves"),
    }

    db.table("recruiters").update(update_data).eq("id", rec["id"]).execute()

    # Trigger matching scan in background
    dispatch_task(background_tasks, "run_matching_scan", recruiter_id=rec["id"])

    return {
        "status": "activated",
        "recruiter": {
            "id": rec["id"],
            "position": update_data["position"],
            "salary_range_min": update_data["salary_range_min"],
            "salary_range_max": update_data["salary_range_max"],
            "must_haves": update_data["must_haves"],
        },
    }


@router.get("/talent")
async def get_talent_pool(
    skills: str | None = None,
    salary_max: int | None = None,
    title: str | None = None,
    remote: str | None = None,
    category: str | None = None,
    experience_level: str | None = None,
    verification_type: str | None = None,
    availability: str | None = None,
    job_id: str | None = None,
    user=Depends(get_current_user),
):
    db = get_db()

    # Query candidates with their profile information
    res = db.table("candidates").select("*, profile:profiles(name)").execute()
    if not res.data:
        return {"talent": []}

    # Fetch recruiter's active jobs to compute dynamic fit score against candidate profile
    recruiter_res = db.table("recruiters").select("id").eq("profile_id", user.id).execute()
    current_job = None
    if job_id:
        job_res = db.table("jobs").select("*").eq("id", job_id).execute()
        if job_res.data:
            current_job = job_res.data[0]
    elif recruiter_res.data:
        rec_id = recruiter_res.data[0]["id"]
        jobs_res = db.table("jobs").select("*").eq("recruiter_id", rec_id).eq("status", "active").execute()
        if jobs_res.data:
            current_job = jobs_res.data[0]

    from api.matching import calculate_dynamic_fit_score, generate_match_insights

    candidates = res.data
    filtered = []

    for c in candidates:
        if not c.get("title") and not c.get("skills"):
            continue

        # Dynamic attribute resolution for search filters & UI badges
        title_str = (c.get("title") or "").lower()
        skills_lower = [s.lower() for s in (c.get("skills") or [])]
        
        # 1. Resolve Category
        if "devops" in title_str or "infra" in title_str or "docker" in skills_lower:
            cand_category = "DevOps"
        elif "frontend" in title_str or "react" in skills_lower:
            cand_category = "Frontend"
        elif "backend" in title_str or "go" in skills_lower or "node" in skills_lower:
            cand_category = "Backend"
        elif "ai" in title_str or "ml" in title_str or "nlp" in title_str or "pytorch" in skills_lower:
            cand_category = "AI/ML"
        elif "data" in title_str or "analytics" in title_str:
            cand_category = "Data"
        else:
            cand_category = "Full Stack"
            
        # 2. Resolve Experience Level
        if "senior" in title_str or "lead" in title_str or (c.get("salary_min") and c.get("salary_min") >= 100000):
            cand_exp = "Senior"
        elif "intern" in title_str or "junior" in title_str or "fellow" in title_str or (c.get("salary_min") and c.get("salary_min") <= 40000):
            cand_exp = "Junior"
        else:
            cand_exp = "Mid"
            
        # 3. Resolve Verification
        github_verified = bool(c.get("github_url"))
        human_verified = bool(c.get("portfolio_url")) or cand_exp == "Senior"
        
        # 4. Resolve Availability
        avail_field = (c.get("availability") or "").lower()
        if "30" in avail_field:
            cand_availability = "30"
        elif "60" in avail_field:
            cand_availability = "60"
        elif "90" in avail_field:
            cand_availability = "90"
        else:
            cand_availability = "immediate"

        # Apply Filters
        if category and category.lower() != "any":
            if cand_category.lower() != category.lower():
                continue
                
        if experience_level and experience_level.lower() != "any":
            if cand_exp.lower() != experience_level.lower():
                continue
                
        if verification_type and verification_type.lower() != "any":
            if verification_type.lower() == "github" and not github_verified:
                continue
            if verification_type.lower() == "human" and not human_verified:
                continue
            if verification_type.lower() == "both" and not (github_verified and human_verified):
                continue
                
        if availability and availability.lower() != "any":
            if cand_availability != availability.lower():
                continue

        if title:
            if title.lower() not in title_str:
                continue

        if salary_max is not None:
            c_sal = c.get("salary_min")
            if c_sal is not None and c_sal > salary_max:
                continue

        if remote == "true" or remote == "yes":
            if not c.get("remote_pref"):
                continue

        if skills:
            skill_list = [s.strip().lower() for s in skills.split(",") if s.strip()]
            if skill_list and not any(s in skills_lower for s in skill_list):
                continue

        # Calculate fit score against recruiter's current open job
        why_matched = []
        missing = []
        if current_job:
            fit_score = int(round(calculate_dynamic_fit_score(c, current_job) * 100))
            why_matched, missing = generate_match_insights(c, current_job)
        else:
            # Fallback mock score
            fit_score = 75 + (c.get("salary_min") or 10000) % 21

        filtered.append(
            {
                "id": c["id"],
                "title": c.get("title"),
                "skills": c.get("skills") or [],
                "salary_min": c.get("salary_min"),
                "remote_pref": c.get("remote_pref"),
                "name": c.get("profile", {}).get("name") if c.get("profile") else "Anonymous Candidate",
                "email": "",
                "bio": c.get("bio") or "",
                "github_verified": github_verified,
                "human_verified": human_verified,
                "category": cand_category,
                "experience_level": cand_exp,
                "availability_days": cand_availability,
                "fit_score": fit_score,
                "why_matched": why_matched,
                "missing": missing
            }
        )

    filtered.sort(key=lambda x: x["fit_score"], reverse=True)
    return {"talent": filtered}


@router.post("/initiate-negotiation")
async def initiate_negotiation(
    payload: dict,
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user),
):
    recruiter_id = payload.get("recruiter_id")
    candidate_id = payload.get("candidate_id")
    job_id = payload.get("job_id")

    if not recruiter_id or not candidate_id:
        raise HTTPException(
            status_code=400, detail="Missing recruiter_id or candidate_id"
        )

    assert_negotiation_participant(recruiter_id, candidate_id, user)

    db = get_db()

    # Check if a negotiation already exists in an ongoing or completed state
    existing = (
        db.table("negotiations")
        .select("id, status, candidate_notes")
        .eq("candidate_id", candidate_id)
        .eq("recruiter_id", recruiter_id)
        .in_("status", ["active", "matched", "scheduled", "completed"])
        .execute()
    )
    matching_neg = None
    if existing.data:
        if job_id:
            for n in existing.data:
                notes = n.get("candidate_notes") or ""
                if job_id in notes:
                    matching_neg = n
                    break
        else:
            matching_neg = existing.data[0]

    if matching_neg:
        return {
            "status": "exists",
            "negotiation_id": matching_neg["id"],
            "negotiation_status": matching_neg["status"],
        }

    # Fetch candidate and recruiter to compute initial fit score
    cand_res = db.table("candidates").select("*").eq("id", candidate_id).execute()
    rec_res = db.table("recruiters").select("*").eq("id", recruiter_id).execute()

    if not cand_res.data or not rec_res.data:
        raise HTTPException(status_code=404, detail="Candidate or Recruiter not found")

    cand = cand_res.data[0]
    rec = rec_res.data[0]

    rec_data = dict(rec)
    if job_id:
        job_res = db.table("jobs").select("*").eq("id", job_id).execute()
        if job_res.data:
            job = job_res.data[0]
            rec_data["position"] = job.get("title") or rec_data.get("position")
            rec_data["company"] = job.get("company") or rec_data.get("company")
            rec_data["salary_range_min"] = (
                job.get("salary_min")
                if job.get("salary_min") is not None
                else rec_data.get("salary_range_min")
            )
            rec_data["salary_range_max"] = (
                job.get("salary_max")
                if job.get("salary_max") is not None
                else rec_data.get("salary_range_max")
            )
            rec_data["must_haves"] = (
                job.get("stack")
                if job.get("stack") is not None
                else rec_data.get("must_haves")
            )

    from agents.negotiation.protocol import FitScoreInput, calculate_fit_score

    skills_dict = {s: "verified" for s in (cand.get("skills") or [])}
    reqs_dict = {s: "required" for s in (rec_data.get("must_haves") or [])}

    fit_input = FitScoreInput(
        candidate_verified_skills=skills_dict,
        candidate_salary_min=cand.get("salary_min"),
        candidate_salary_target=None,
        candidate_dealbreakers=cand.get("dealbreakers") or [],
        candidate_priorities=["remote"] if cand.get("remote_pref") else [],
        recruiter_requirements=reqs_dict,
        recruiter_salary_ceiling=rec_data.get("salary_range_max"),
        recruiter_salary_budget=rec_data.get("salary_range_min"),
        recruiter_must_haves=rec_data.get("must_haves") or [],
        recruiter_dealbreakers=rec_data.get("dealbreakers") or [],
    )

    fit_score = calculate_fit_score(fit_input)

    notes_str = f"job_id:{job_id}" if job_id else ""
    # Insert new negotiation
    neg_res = (
        db.table("negotiations")
        .insert(
            {
                "candidate_id": candidate_id,
                "recruiter_id": recruiter_id,
                "status": "active",
                "fit_score": int(round(fit_score * 100)),
                "candidate_notes": notes_str,
            }
        )
        .execute()
    )

    if not neg_res.data:
        raise HTTPException(status_code=500, detail="Failed to create negotiation")

    negotiation_id = neg_res.data[0]["id"]

    # Trigger negotiation loop and notify both parties
    dispatch_task(background_tasks, "notify_new_match", negotiation_id=negotiation_id)
    dispatch_task(
        background_tasks, "run_negotiation_loop", negotiation_id=negotiation_id
    )

    return {"status": "started", "negotiation_id": negotiation_id}
