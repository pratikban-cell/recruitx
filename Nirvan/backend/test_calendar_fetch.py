import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from api.calendar import get_calendar_events, refresh_access_token
from db.client import get_db

async def test_fetch():
    db = get_db()
    res = db.table("calendar_connections").select("*").execute()
    for row in res.data or []:
        profile_id = row["profile_id"]
        email = row["email"]
        print(f"Testing Profile: {profile_id} ({email})")
        
        # Manually refresh the token and call the API
        access_token = await refresh_access_token(profile_id)
        if not access_token:
            print("  Failed to get access token.")
            continue
            
        print(f"  Access Token: {access_token[:20]}...")
        
        # Call the Google Calendar endpoint via backend logic
        import httpx
        try:
            async with httpx.AsyncClient() as client:
                params = {
                    "singleEvents": "true",
                    "orderBy": "startTime",
                }
                resp = await client.get(
                    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
                    headers={"Authorization": f"Bearer {access_token}"},
                    params=params,
                )
                print(f"  Google API Status: {resp.status_code}")
                if resp.status_code == 200:
                    items = resp.json().get("items", [])
                    print(f"  Found {len(items)} events.")
                    for item in items[:5]:
                        start = item.get("start", {})
                        start_dt = start.get("dateTime") or start.get("date")
                        print(f"    - {item.get('summary')}: {start_dt}")
                else:
                    print(f"  Google API Error: {resp.text}")
        except Exception as e:
            print(f"  Error: {str(e)}")
        print("-" * 50)

if __name__ == "__main__":
    asyncio.run(test_fetch())
