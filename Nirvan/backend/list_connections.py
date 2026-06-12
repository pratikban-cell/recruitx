import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from db.client import get_db

def main():
    db = get_db()
    res = db.table("calendar_connections").select("*").execute()
    print("CALENDAR CONNECTIONS:")
    for row in res.data or []:
        print(f"  Profile ID: {row.get('profile_id')}")
        print(f"  Email: {row.get('email')}")
        print(f"  Access Token: {row.get('access_token')[:15]}...")
        print(f"  Refresh Token: {row.get('refresh_token')[:15] if row.get('refresh_token') else 'None'}...")
        print(f"  Expires At: {row.get('expires_at')}")
        print("-" * 40)

if __name__ == "__main__":
    main()
