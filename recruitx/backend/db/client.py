import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
# Attempt to load the Service Role Key for RLS bypass, fallback to Anon Key if not present
_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

_supabase: Client | None = None


def get_db() -> Client:
    global _supabase
    if _supabase is None:
        if not _url or not _key:
            raise RuntimeError("Missing Supabase credentials (URL or Key)")
        
        # Check if we are running with the Anon key and issue a non-blocking alert
        if _key == os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY"):
            print("WARNING: Running backend database queries with standard ANON key. RLS policies may restrict results.")
            
        _supabase = create_client(_url, _key)
    return _supabase
