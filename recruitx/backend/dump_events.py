import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from api.calendar import get_calendar_events
from db.client import get_db

async def main():
    profile_id = "9b6b4923-663b-4ddc-8863-09d3c47d4da7"
    # Mock class for fastapi Dependency User
    class MockUser:
        def __init__(self, id):
            self.id = id
    
    mock_user = MockUser(profile_id)
    
    events_res = await get_calendar_events(
        profile_id=profile_id,
        user=mock_user
    )
    
    print(f"Events fetched: {len(events_res.get('events', []))}")
    with open("fetched_events.json", "w", encoding="utf-8") as f:
        json.dump(events_res, f, indent=2, ensure_ascii=False)
    print("Dumped events to fetched_events.json")

if __name__ == "__main__":
    asyncio.run(main())
