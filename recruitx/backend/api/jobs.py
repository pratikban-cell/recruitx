from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from api.auth import assert_recruiter_owner, get_current_user
from db.client import get_db
from tasks.queue import dispatch_task

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.get("/")
async def list_jobs():
    db = get_db()
    result = db.table("jobs").select("*").order("created_at", desc=True).execute()
    return {"jobs": result.data}


@router.get("/{job_id}")
async def get_job(job_id: str):
    db = get_db()
    result = db.table("jobs").select("*").eq("id", job_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"job": result.data[0]}


@router.post("/")
async def create_job(
    payload: dict,
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user),
):
    recruiter_id = payload.get("recruiter_id")
    if recruiter_id:
        assert_recruiter_owner(recruiter_id, user)

    db = get_db()
    result = db.table("jobs").insert(payload).execute()
    if result.data and payload.get("recruiter_id"):
        dispatch_task(
            background_tasks, "run_matching_scan", recruiter_id=payload["recruiter_id"]
        )
    return {"job": result.data[0]} if result.data else {"job": None}
