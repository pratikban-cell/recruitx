import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from db.client import get_db


def main():
    db = get_db()

    print("CANDIDATES:")
    c_res = db.table("candidates").select("id, profile_id, title").execute()
    for c in c_res.data or []:
        print(
            f"  Candidate ID: {c['id']}, Profile ID: {c['profile_id']}, Title: {c['title']}"
        )

    print("\nRECRUITERS:")
    r_res = db.table("recruiters").select("id, profile_id, company, position").execute()
    for r in r_res.data or []:
        print(
            f"  Recruiter ID: {r['id']}, Profile ID: {r['profile_id']}, Company: {r['company']}, Position: {r['position']}"
        )

    print("\nJOBS:")
    j_res = (
        db.table("jobs").select("id, recruiter_id, company, title, status").execute()
    )
    for j in j_res.data or []:
        print(
            f"  Job ID: {j['id']}, Recruiter ID: {j['recruiter_id']}, Company: {j['company']}, Title: {j['title']}, Status: {j['status']}"
        )

    print("\nNEGOTIATIONS:")
    n_res = (
        db.table("negotiations")
        .select("id, candidate_id, recruiter_id, status")
        .execute()
    )
    for n in n_res.data or []:
        print(
            f"  Nego ID: {n['id']}, Candidate ID: {n['candidate_id']}, Recruiter ID: {n['recruiter_id']}, Status: {n['status']}"
        )


if __name__ == "__main__":
    main()
