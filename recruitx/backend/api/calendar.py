import os
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from api.auth import assert_profile_owner, get_current_user
from db.client import get_db

router = APIRouter(prefix="/api/calendar", tags=["calendar"])

CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
FRONTEND_BASE_URL = os.environ.get("FRONTEND_BASE_URL", "http://localhost:3000")
REDIRECT_URI = os.environ.get(
    "GOOGLE_REDIRECT_URI", "http://localhost:8000/api/calendar/callback"
)


class ConnectRequest(BaseModel):
    profile_id: str


class CallbackResponse(BaseModel):
    status: str
    email: str


# ── Token Refresh Helper ────────────────────────────────


async def refresh_access_token(profile_id: str) -> Optional[str]:
    """
    Checks token validity for a user, refreshes it if expired, and returns the active access_token.
    Supports mock token in mock mode.
    """
    db = get_db()
    res = (
        db.table("calendar_connections")
        .select("*")
        .eq("profile_id", profile_id)
        .execute()
    )
    if not res.data:
        return None

    conn = res.data[0]
    expires_at = datetime.fromisoformat(conn["expires_at"].replace("Z", "+00:00"))

    # If not expired, return active token
    if expires_at > datetime.now(timezone.utc):
        return conn["access_token"]

    # If mock token, just auto-renew it
    if conn["refresh_token"] == "mock_refresh_token":
        new_expiry = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        db.table("calendar_connections").update(
            {"access_token": "mock_access_token", "expires_at": new_expiry}
        ).eq("profile_id", profile_id).execute()
        return "mock_access_token"

    # Real Google Token Refresh
    if not CLIENT_ID or not CLIENT_SECRET:
        return None

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
                "refresh_token": conn["refresh_token"],
                "grant_type": "refresh_token",
            },
        )
        if resp.status_code != 200:
            print(f"Failed to refresh Google token: {resp.text}")
            return None

        data = resp.json()
        new_access = data["access_token"]
        expires_in = data.get("expires_in", 3600)
        new_expiry = (
            datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        ).isoformat()

        db.table("calendar_connections").update(
            {"access_token": new_access, "expires_at": new_expiry}
        ).eq("profile_id", profile_id).execute()

        return new_access


# ── API Endpoints ─────────────────────────────────────


@router.get("/connect")
async def get_connect_url(profile_id: str, user=Depends(get_current_user)):
    """
    Generates OAuth connection URL. Falls back to mock callback redirect if Client ID is missing.
    """
    assert_profile_owner(profile_id, user)
    db = get_db()
    role = "candidate"
    role_res = db.table("profiles").select("role").eq("id", profile_id).execute()
    if role_res.data:
        role = role_res.data[0].get("role") or "candidate"

    if not CLIENT_ID or not CLIENT_SECRET:
        # Mock mode: return direct frontend landing callback URL
        mock_callback_url = f"{FRONTEND_BASE_URL}/dashboard/{role}/settings?mock_calendar_connect=true&profile_id={profile_id}"
        return {"url": mock_callback_url, "mock": True}

    scopes = "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email"
    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={CLIENT_ID}"
        f"&redirect_uri={REDIRECT_URI}"
        f"&response_type=code"
        f"&scope={scopes}"
        f"&access_type=offline"
        f"&prompt=consent"
        f"&state={profile_id}"
    )
    return {"url": auth_url, "mock": False}


@router.get("/callback")
async def oauth_callback(code: Optional[str] = None, state: Optional[str] = None):
    """
    Callback handler that exchanges code for Google OAuth tokens.
    """
    if not code or not state:
        raise HTTPException(
            status_code=400, detail="Missing auth code or state parameter."
        )

    profile_id = state

    # Real Google Exchange
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
                "code": code,
                "redirect_uri": REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        if resp.status_code != 200:
            raise HTTPException(
                status_code=400, detail=f"Google token exchange failed: {resp.text}"
            )

        token_data = resp.json()
        access_token = token_data["access_token"]
        refresh_token = token_data.get("refresh_token")
        expires_in = token_data.get("expires_in", 3600)
        expires_at = (
            datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        ).isoformat()

        # Query connected user's email
        email_resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        email = (
            email_resp.json().get("email", "unknown@gmail.com")
            if email_resp.status_code == 200
            else "unknown@gmail.com"
        )

        # Save connection details in Supabase
        db = get_db()
        # Safe check-and-upsert to prevent duplicate key violations due to unique constraint on profile_id
        existing = (
            db.table("calendar_connections")
            .select("id")
            .eq("profile_id", profile_id)
            .execute()
        )
        if existing.data:
            db.table("calendar_connections").update(
                {
                    "access_token": access_token,
                    "refresh_token": refresh_token or "existing_refresh_token",
                    "expires_at": expires_at,
                    "email": email,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            ).eq("profile_id", profile_id).execute()
        else:
            db.table("calendar_connections").insert(
                {
                    "profile_id": profile_id,
                    "access_token": access_token,
                    "refresh_token": refresh_token or "existing_refresh_token",
                    "expires_at": expires_at,
                    "email": email,
                }
            ).execute()

    db = get_db()
    role = "candidate"
    role_res = db.table("profiles").select("role").eq("id", profile_id).execute()
    if role_res.data:
        role = role_res.data[0].get("role") or "candidate"

    # Redirect back to user's settings dashboard
    from fastapi.responses import RedirectResponse

    return RedirectResponse(
        url=f"{FRONTEND_BASE_URL}/dashboard/{role}/settings?calendar_connected=true"
    )


@router.post("/mock-connect")
async def mock_connect(req: ConnectRequest, user=Depends(get_current_user)):
    """
    Direct endpoint to save a mock calendar connection for testing.
    """
    assert_profile_owner(req.profile_id, user)
    db = get_db()
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()

    email_val = f"agent_demo_{req.profile_id[:5]}@nirvan-scheduler.ai"
    # Safe check-and-upsert to prevent duplicate key violations due to unique constraint on profile_id
    existing = (
        db.table("calendar_connections")
        .select("id")
        .eq("profile_id", req.profile_id)
        .execute()
    )
    if existing.data:
        db.table("calendar_connections").update(
            {
                "access_token": "mock_access_token",
                "refresh_token": "mock_refresh_token",
                "expires_at": expires_at,
                "email": email_val,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("profile_id", req.profile_id).execute()
    else:
        db.table("calendar_connections").insert(
            {
                "profile_id": req.profile_id,
                "access_token": "mock_access_token",
                "refresh_token": "mock_refresh_token",
                "expires_at": expires_at,
                "email": email_val,
            }
        ).execute()

    return {"status": "connected", "email": email_val}


@router.get("/status")
async def get_connection_status(profile_id: str, user=Depends(get_current_user)):
    """
    Checks if a user has connected their Google Calendar.
    """
    assert_profile_owner(profile_id, user)
    db = get_db()
    res = (
        db.table("calendar_connections")
        .select("email, created_at")
        .eq("profile_id", profile_id)
        .execute()
    )
    if res.data:
        return {"connected": True, "email": res.data[0]["email"]}
    return {"connected": False}


@router.post("/disconnect")
async def disconnect_calendar(req: ConnectRequest, user=Depends(get_current_user)):
    """
    Disconnects the calendar mapping.
    """
    assert_profile_owner(req.profile_id, user)
    db = get_db()
    db.table("calendar_connections").delete().eq("profile_id", req.profile_id).execute()
    return {"status": "disconnected"}


@router.get("/events")
async def get_calendar_events(
    profile_id: str,
    time_min: Optional[str] = None,
    time_max: Optional[str] = None,
    user=Depends(get_current_user),
):
    """
    Fetches real Google Calendar events for the connected user.
    """
    assert_profile_owner(profile_id, user)

    # Refresh token and get access token
    access_token = await refresh_access_token(profile_id)
    if not access_token:
        return {"events": []}

    if access_token == "mock_access_token":
        # Mock mode: return some mock calendar events for testing
        mock_events = [
            {
                "summary": "Mock Meeting: Project Intro",
                "start": (datetime.now(timezone.utc) + timedelta(days=1))
                .replace(hour=10, minute=0, second=0, microsecond=0)
                .isoformat(),
                "end": (datetime.now(timezone.utc) + timedelta(days=1))
                .replace(hour=11, minute=0, second=0, microsecond=0)
                .isoformat(),
                "hangoutLink": "https://meet.google.com/abc-mock-meet",
            },
            {
                "summary": "Mock Task: Review Resume",
                "start": (datetime.now(timezone.utc) + timedelta(days=2))
                .replace(hour=14, minute=0, second=0, microsecond=0)
                .isoformat(),
                "end": (datetime.now(timezone.utc) + timedelta(days=2))
                .replace(hour=15, minute=0, second=0, microsecond=0)
                .isoformat(),
            },
        ]
        return {"events": mock_events}

    try:
        async with httpx.AsyncClient() as client:
            params = {
                "singleEvents": "true",
                "orderBy": "startTime",
            }
            if time_min:
                params["timeMin"] = time_min
            if time_max:
                params["timeMax"] = time_max

            resp = await client.get(
                "https://www.googleapis.com/calendar/v3/calendars/primary/events",
                headers={"Authorization": f"Bearer {access_token}"},
                params=params,
            )
            if resp.status_code == 200:
                data = resp.json()
                items = data.get("items", [])

                # Format to a simpler response
                formatted = []
                for item in items:
                    # Ignore cancelled events
                    if item.get("status") == "cancelled":
                        continue

                    start = item.get("start", {})
                    end = item.get("end", {})

                    # Google Calendar API returns start/end as dateTime or date (for all-day events)
                    start_dt = start.get("dateTime") or start.get("date")
                    end_dt = end.get("dateTime") or end.get("date")

                    if not start_dt:
                        continue

                    formatted.append(
                        {
                            "summary": item.get("summary", "No Title"),
                            "description": item.get("description", ""),
                            "start": start_dt,
                            "end": end_dt,
                            "hangoutLink": item.get("hangoutLink", ""),
                        }
                    )
                return {"events": formatted}
            else:
                print(f"Failed to fetch Google Calendar events: {resp.text}")
                return {"events": [], "error": resp.text}
    except Exception as e:
        print(f"Error fetching Google Calendar events: {str(e)}")
        return {"events": [], "error": str(e)}
