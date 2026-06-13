from __future__ import annotations

import io
import json

import pypdf
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile

from agents.candidate.graph import build_candidate_graph
from api.auth import assert_negotiation_owner, assert_profile_owner, get_current_user
from db.client import get_db
from tasks.queue import dispatch_task

router = APIRouter(prefix="/api/candidates", tags=["candidates"])


@router.post("/activate")
async def activate_candidate(
    payload: dict,
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user),
):
    profile_id = payload.get("profile_id")
    raw_bio = payload.get("bio")
    github_url = payload.get("github_url")
    portfolio_url = payload.get("portfolio_url")

    if github_url is not None:
        github_url = github_url.strip() if github_url.strip() else None
    if portfolio_url is not None:
        portfolio_url = portfolio_url.strip() if portfolio_url.strip() else None

    if not profile_id or not raw_bio:
        raise HTTPException(status_code=400, detail="Missing profile_id or bio")

    assert_profile_owner(profile_id, user)

    db = get_db()

    # Fetch candidate
    cand_res = db.table("candidates").select("*").eq("profile_id", profile_id).execute()
    if not cand_res.data:
        raise HTTPException(status_code=404, detail="Candidate profile not found")
    cand = cand_res.data[0]

    # Run LangGraph candidate profile builder node
    candidate_graph = build_candidate_graph()

    state = {
        "user_id": cand["id"],
        "profile": {"raw_input": raw_bio},
        "verified_skills": {},
        "preferences": {},
        "dealbreakers": [],
        "salary_floor": None,
        "salary_target": None,
        "fit_score": 0.0,
        "active_negotiations": [],
        "matches": [],
        "scheduled_meetings": [],
        "escalations": [],
        "messages": [],
        "current_task": None,
    }

    res = await candidate_graph.ainvoke(
        state, config={"configurable": {"thread_id": cand["id"]}}
    )

    preferences = res.get("preferences") or {}
    dealbreakers = res.get("dealbreakers") or []
    salary_floor = res.get("salary_floor") or cand.get("salary_min")
    title = res.get("title") or cand.get("title")
    skills = res.get("skills") or cand.get("skills") or []

    curr_availability = "immediate"
    curr_equity = ""
    curr_style = "collaborative"

    avail_str = cand.get("availability") or ""
    if "|" in avail_str:
        parts = avail_str.split("|")
        curr_availability = parts[0]
        for p in parts[1:]:
            if ":" in p:
                k, v = p.split(":", 1)
                if k == "equity_demand_threshold":
                    curr_equity = v
                elif k == "negotiation_style":
                    curr_style = v
    else:
        curr_availability = avail_str or "immediate"

    import urllib.parse

    serialized_avail = f"{curr_availability}|equity_demand_threshold:{curr_equity}|negotiation_style:{curr_style}|bio:{urllib.parse.quote(raw_bio)}"

    update_data = {
        "title": title,
        "skills": skills,
        "dealbreakers": dealbreakers,
        "salary_min": salary_floor,
        "remote_pref": preferences.get("remote", True),
        "availability": serialized_avail,
    }
    if github_url is not None:
        update_data["github_url"] = github_url
    if portfolio_url is not None:
        update_data["portfolio_url"] = portfolio_url

    db.table("candidates").update(update_data).eq("id", cand["id"]).execute()

    # Trigger matching scan for this candidate
    dispatch_task(background_tasks, "run_matching_scan", candidate_id=cand["id"])

    # Trigger live profile sourcing/enrichment task (scrapes GitHub and Portfolio)
    dispatch_task(background_tasks, "enrich_profile", candidate_id=cand["id"])

    return {
        "status": "activated",
        "candidate": {
            "id": cand["id"],
            "title": title,
            "skills": skills,
            "dealbreakers": dealbreakers,
            "salary_min": salary_floor,
            "remote_pref": preferences.get("remote", True),
        },
    }


@router.post("/parse-resume")
async def parse_resume(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
):
    try:
        content = await file.read()
        pdf_reader = pypdf.PdfReader(io.BytesIO(content))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() or ""
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read PDF: {str(e)}")

    if not text.strip():
        raise HTTPException(
            status_code=400, detail="The uploaded PDF is empty or could not be parsed."
        )

    import os

    from openai import OpenAI

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")

    client = OpenAI(api_key=api_key)

    system_prompt = """You are an expert AI talent sourcing system. Parse the following candidate's resume text.
Extract information exactly into a JSON format with:
- title (str, e.g., Senior Fullstack Engineer)
- skills (list of str, e.g., ["React", "Python", "Docker"])
- salary_min (int, e.g., 120000, or null if not indicated)
- remote_pref (bool, default to true)
- bio (str, a concise 2-sentence professional bio summary based on their experience)
- dealbreakers (list of str, e.g., ["No visa support", "Hybrid/On-site"])

Do not include any markup, other text, or explanation. Return ONLY a valid JSON object."""

    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text},
            ],
            response_format={"type": "json_object"},
        )
        parsed = json.loads(resp.choices[0].message.content or "{}")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to parse with AI: {str(e)}"
        )

    return parsed


@router.post("/coach")
async def get_negotiation_coaching(
    payload: dict,
    user=Depends(get_current_user),
):
    negotiation_id = payload.get("negotiation_id")
    user_message = payload.get("user_message")
    chat_history = payload.get("chat_history", [])

    if not negotiation_id:
        raise HTTPException(status_code=400, detail="Missing negotiation_id")

    assert_negotiation_owner(negotiation_id, user)

    db = get_db()

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
            "Candidate AI Agent"
            if m["sender_role"] == "candidate"
            else ("Recruiter AI Agent" if m["sender_role"] == "recruiter" else "System")
        )
        transcript += f"{sender}: {m['content']}\n"

    import os

    from openai import OpenAI

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")

    client = OpenAI(api_key=api_key)

    system_prompt = f"""You are Coach recruitx, a premium, hyper-intelligent interview prep agent and negotiation advisor.
You are helping a candidate prepare for an upcoming interview or review their AI agent's negotiation transcript.

Here are the negotiation details:
- Candidate Title: {neg["candidate"]["title"] if neg.get("candidate") else "N/A"}
- Recruiter Company: {neg["recruiter"]["company"] if neg.get("recruiter") else "N/A"}
- Negotiation Status: {neg["status"]}
- Negotiation style of Candidate: {neg["candidate"].get("negotiation_style", "collaborative") if neg.get("candidate") else "collaborative"}
- Negotiation style of Recruiter: {neg["recruiter"].get("negotiation_style", "collaborative") if neg.get("recruiter") else "collaborative"}

Here is the full text transcript of the negotiation so far:
---
{transcript}
---

Your goal is to be a supportive but highly strategic coach. Analyze the conversation, highlight where the candidate's agent succeeded, where there was tension (e.g. salary, equity, remote), and how they should pitch themselves in the live meeting.

If the user is asking a custom question, answer it directly and tactically based on the transcript.
Otherwise, provide a comprehensive "Interview Prep & Negotiation Review" report. Include:
1. **Agent Performance Summary**: How did their agent represent them?
2. **Key Insights**: What does the recruiter care about most based on their messages?
3. **Interview Cheat Sheet**: 3 concrete, personalized talking points to win them over.
"""

    messages_payload = [{"role": "system", "content": system_prompt}]
    for h in chat_history:
        messages_payload.append(
            {"role": h.get("role", "user"), "content": h.get("content", "")}
        )

    if user_message:
        messages_payload.append({"role": "user", "content": user_message})
    else:
        messages_payload.append(
            {
                "role": "user",
                "content": "Generate my interview prep report and strategic coaching analysis.",
            }
        )

    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages_payload,
        )
        coach_response = resp.choices[0].message.content
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to communicate with Coach: {str(e)}"
        )

    return {"response": coach_response}
