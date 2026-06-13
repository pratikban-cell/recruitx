from __future__ import annotations

import os
from typing import Any

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from db.client import get_db

security = HTTPBearer(auto_error=False)
ALLOW_DEV_AUTH_BYPASS = (
    os.environ.get("ALLOW_DEV_AUTH_BYPASS", "false").lower() == "true"
)


def _mock_user() -> dict[str, str]:
    return {
        "id": "mock-developer-id",
        "email": "mock@nirvan.ai",
        "role": "authenticated",
    }


def get_user_id(user: Any) -> str | None:
    if hasattr(user, "id"):
        return user.id
    if isinstance(user, dict):
        return user.get("id") or user.get("sub")
    return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    if not credentials:
        if ALLOW_DEV_AUTH_BYPASS:
            return _mock_user()
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = credentials.credentials
    try:
        db = get_db()
        res = db.auth.get_user(token)
        if res and hasattr(res, "user") and res.user:
            return res.user
        if res and isinstance(res, dict) and res.get("user"):
            return res["user"]
        raise HTTPException(status_code=401, detail="Invalid Supabase JWT token")
    except HTTPException:
        raise
    except Exception as exc:
        if ALLOW_DEV_AUTH_BYPASS:
            print(
                f"JWT verification failed: {exc}. Falling back to mock developer context."
            )
            return _mock_user()
        raise HTTPException(
            status_code=401, detail="Invalid or expired bearer token"
        ) from exc


def assert_profile_owner(profile_id: str, user: Any) -> None:
    user_id = get_user_id(user)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid authenticated user")
    if user_id == "mock-developer-id" and ALLOW_DEV_AUTH_BYPASS:
        return
    if user_id != profile_id:
        raise HTTPException(
            status_code=403, detail="You do not have access to this profile"
        )


def assert_recruiter_owner(recruiter_id: str, user: Any) -> None:
    user_id = get_user_id(user)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid authenticated user")
    if user_id == "mock-developer-id" and ALLOW_DEV_AUTH_BYPASS:
        return

    db = get_db()
    rec_res = (
        db.table("recruiters").select("profile_id").eq("id", recruiter_id).execute()
    )
    if not rec_res.data:
        raise HTTPException(status_code=404, detail="Recruiter profile not found")
    if rec_res.data[0]["profile_id"] != user_id:
        raise HTTPException(
            status_code=403, detail="You do not have access to this recruiter resource"
        )


def assert_negotiation_participant(
    recruiter_id: str, candidate_id: str, user: Any
) -> None:
    user_id = get_user_id(user)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid authenticated user")
    if user_id == "mock-developer-id" and ALLOW_DEV_AUTH_BYPASS:
        return

    db = get_db()

    # Check recruiter ownership
    rec_res = (
        db.table("recruiters").select("profile_id").eq("id", recruiter_id).execute()
    )
    if rec_res.data and rec_res.data[0]["profile_id"] == user_id:
        return

    # Check candidate ownership
    cand_res = (
        db.table("candidates").select("profile_id").eq("id", candidate_id).execute()
    )
    if cand_res.data and cand_res.data[0]["profile_id"] == user_id:
        return

    raise HTTPException(
        status_code=403,
        detail="You do not have access to initiate this negotiation resource",
    )


def assert_negotiation_owner(negotiation_id: str, user: Any) -> None:
    user_id = get_user_id(user)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid authenticated user")
    if user_id == "mock-developer-id" and ALLOW_DEV_AUTH_BYPASS:
        return

    db = get_db()
    neg_res = db.table("negotiations").select("*").eq("id", negotiation_id).execute()
    if not neg_res.data:
        raise HTTPException(status_code=404, detail="Negotiation not found")
    neg = neg_res.data[0]

    rec_res = (
        db.table("recruiters")
        .select("profile_id")
        .eq("id", neg["recruiter_id"])
        .execute()
    )
    cand_res = (
        db.table("candidates")
        .select("profile_id")
        .eq("id", neg["candidate_id"])
        .execute()
    )

    allowed_profiles: list[str] = []
    if rec_res.data:
        allowed_profiles.append(rec_res.data[0]["profile_id"])
    if cand_res.data:
        allowed_profiles.append(cand_res.data[0]["profile_id"])

    if user_id not in allowed_profiles:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this negotiation resource",
        )


async def verify_negotiation_owner(
    negotiation_id: str,
    user=Depends(get_current_user),
):
    assert_negotiation_owner(negotiation_id, user)
    return user
