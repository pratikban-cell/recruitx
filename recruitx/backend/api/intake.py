from __future__ import annotations

import json
import os

from fastapi import APIRouter, Depends, HTTPException
from openai import OpenAI

from api.auth import assert_profile_owner, get_current_user
from db.client import get_db

router = APIRouter(prefix="/api/intake", tags=["intake"])

_INTAKE_SYSTEM_PROMPT = """You are a helpful recruitment intake agent. Your goal is to gather job requirements from a hiring manager to create a new job posting.

You need to gather:
1. Job Title & Company Name
2. Tech Stack (preferred/required skills)
3. Remote Policy (remote, hybrid, onsite) and Location
4. Salary Range (min and max)
5. Short description of role/responsibilities

Guidelines:
- Converse naturally and ask friendly, targeted questions (only one or two at a time) to gather missing information.
- Once you have enough information to form a solid job posting, reply with a final response starting with the token `[COMPLETE]` followed by a JSON object containing the parsed fields.
- JSON structure to return on complete:
{
  "title": "Job Title",
  "company": "Company Name",
  "location": "Location",
  "remote_policy": "remote" | "hybrid" | "onsite",
  "salary_min": 120000,
  "salary_max": 160000,
  "stack": ["skill1", "skill2"],
  "description": "Short summary",
  "culture_signals": "string or null",
  "experience_required": "string or null",
  "dealbreaker_flexibility": "string or null"
}
Do NOT include `[COMPLETE]` until you have enough details to save the job record.
"""


def _get_llm() -> OpenAI:
    return OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


@router.post("/chat")
async def intake_chat(payload: dict, user=Depends(get_current_user)):
    messages = payload.get("messages", [])
    profile_id = payload.get("profile_id")

    if not messages:
        raise HTTPException(status_code=400, detail="Missing messages")
    if profile_id:
        assert_profile_owner(profile_id, user)

    llm = _get_llm()

    # Format messages for OpenAI API
    api_messages = [{"role": "system", "content": _INTAKE_SYSTEM_PROMPT}]
    for m in messages:
        # map roles
        role = "assistant" if m.get("role") == "agent" else "user"
        api_messages.append({"role": role, "content": m.get("content", "")})

    resp = llm.chat.completions.create(
        model="gpt-4o-mini", messages=api_messages, temperature=0.7
    )

    reply = resp.choices[0].message.content or ""

    complete = False
    extracted_job = None

    if "[COMPLETE]" in reply:
        complete = True
        # Extract the JSON part
        try:
            json_part = reply.split("[COMPLETE]")[1].strip()
            # Handle markdown codeblock if present
            if "```json" in json_part:
                json_part = json_part.split("```json")[1].split("```")[0].strip()
            elif "```" in json_part:
                json_part = json_part.split("```")[1].split("```")[0].strip()

            extracted_job = json.loads(json_part)
            reply = "Thank you! I've gathered all requirements and published the job posting successfully."

            # Save to Supabase if profile_id is provided
            if profile_id:
                db = get_db()
                # Fetch recruiter ID
                rec_res = (
                    db.table("recruiters")
                    .select("id")
                    .eq("profile_id", profile_id)
                    .execute()
                )
                if rec_res.data:
                    rec_id = rec_res.data[0]["id"]
                    db.table("jobs").insert(
                        {
                            "recruiter_id": rec_id,
                            "company": extracted_job.get("company"),
                            "title": extracted_job.get("title"),
                            "location": extracted_job.get("location"),
                            "remote_policy": extracted_job.get(
                                "remote_policy", "remote"
                            ),
                            "salary_min": extracted_job.get("salary_min"),
                            "salary_max": extracted_job.get("salary_max"),
                            "stack": extracted_job.get("stack", []),
                            "description": extracted_job.get("description"),
                            "culture_signals": extracted_job.get("culture_signals"),
                            "experience_required": extracted_job.get(
                                "experience_required"
                            ),
                            "dealbreaker_flexibility": extracted_job.get(
                                "dealbreaker_flexibility"
                            ),
                            "status": "active",
                        }
                    ).execute()

                    # Propagate to recruiters table
                    db.table("recruiters").update(
                        {
                            "company": extracted_job.get("company"),
                            "position": extracted_job.get("title"),
                            "salary_range_min": extracted_job.get("salary_min"),
                            "salary_range_max": extracted_job.get("salary_max"),
                            "remote_policy": extracted_job.get(
                                "remote_policy", "remote"
                            ),
                            "must_haves": extracted_job.get("stack", []),
                        }
                    ).eq("id", rec_id).execute()
        except Exception as e:
            complete = False
            extracted_job = None
            reply = "I had an issue processing the final requirements list. Could you clarify the salary range or tech stack one more time?"

    return {"reply": reply, "complete": complete, "job": extracted_job}
