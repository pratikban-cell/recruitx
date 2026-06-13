import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from api.negotiations import run_negotiation_loop
from db.client import get_db


async def test_guardrails_flow():
    db = get_db()
    rec_id = "fe9e3b5a-aca8-4138-a8b8-1d4929768f09"
    neg_id = "46983ed8-fc03-456e-a03d-8a06d13f14f1"

    print("--- [1] Fetching Recruiter & Candidate detail ---")
    rec_res = db.table("recruiters").select("*").eq("id", rec_id).execute()
    rec = rec_res.data[0]
    print(f"Current remote_policy / config for Recruiter Zoro: {rec['remote_policy']}")

    # Let's set a strict stubborn style with dealbreaker on salary
    # Luffy is asking $15,000 (minimum salary floor).
    # Let's set the recruiter's budget max salary to $12,000 and standard max salary flex to $14,000.
    # We will trigger dealbreaker_salary=true, which should hit a strict salary impasse or terminate.
    print(
        "\n--- [2] Updating Recruiter Zoro settings to Stubborn with strict salary dealbreaker ---"
    )
    strict_policy = "remote|max_salary_flex:14000|recruiter_negotiation_style:stubborn|dealbreaker_salary:true|dealbreaker_skills:true|dealbreaker_remote:true"
    db.table("recruiters").update(
        {"remote_policy": strict_policy, "salary_range_max": 12000}
    ).eq("id", rec_id).execute()

    # Clear any previous messages on this negotiation room to start a clean turn sequence
    print("\n--- [3] Cleaning up previous messages in negotiation room ---")
    db.table("messages").delete().eq("negotiation_id", neg_id).execute()

    # Reset negotiation status to active
    db.table("negotiations").update({"status": "active"}).eq("id", neg_id).execute()

    print("\n--- [4] Triggering run_negotiation_loop ---")
    await run_negotiation_loop(neg_id)

    print("\n--- [5] Fetching final messages and negotiation status ---")
    neg_status_res = db.table("negotiations").select("*").eq("id", neg_id).execute()
    print(f"Negotiation Status: {neg_status_res.data[0]['status']}")
    print(f"Negotiation Fit Score: {neg_status_res.data[0]['fit_score']}")

    msgs_res = (
        db.table("messages")
        .select("*")
        .eq("negotiation_id", neg_id)
        .order("created_at")
        .execute()
    )
    print("\nNegotiation Messages Dialogue Playback:")
    for msg in msgs_res.data:
        print(f"[{msg['sender_role'].upper()}]: {msg['content']}")


if __name__ == "__main__":
    asyncio.run(test_guardrails_flow())
