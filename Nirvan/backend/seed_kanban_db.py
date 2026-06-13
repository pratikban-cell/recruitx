import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from db.client import get_db


def create_or_get_candidate(
    name: str,
    title: str,
    skills: list,
    salary_min: int,
    email: str,
    github_url: str = None,
    portfolio_url: str = None,
):
    db = get_db()

    # 1. Check if profile already exists in DB by name
    p_res = (
        db.table("profiles")
        .select("*")
        .eq("role", "candidate")
        .eq("name", name)
        .execute()
    )
    if p_res.data:
        profile = p_res.data[0]
        print(f"Profile for candidate {name} already exists: {profile['id']}")
    else:
        # 2. Register candidate via Auth system
        print(f"Signing up auth user for candidate {name} with email: {email}")
        user_id = None
        try:
            auth_res = db.auth.sign_up(
                credentials={"email": email, "password": "Password123!"}
            )
            user_id = auth_res.user.id
            print(f"Created Auth User for candidate {name}: {user_id}")
        except Exception as auth_err:
            print(f"Auth registration failed or user already exists: {auth_err}")

        # Try signing in to set active session
        print(f"Signing in as candidate {name} ({email}) to set client auth context...")
        try:
            login_res = db.auth.sign_in_with_password(
                credentials={"email": email, "password": "Password123!"}
            )
            user_id = login_res.user.id
            print(f"Successfully signed in as candidate {name}: {user_id}")
        except Exception as login_err:
            print(f"Sign in failed: {login_err}")
            if user_id is None:
                pf_res = db.table("profiles").select("*").eq("name", name).execute()
                if pf_res.data:
                    profile = pf_res.data[0]
                    user_id = profile["id"]
                else:
                    raise login_err

        # Check if profile row already exists (trigger might have created it)
        p_check = db.table("profiles").select("*").eq("id", user_id).execute()
        if p_check.data:
            print(f"Profile row for candidate {name} already exists, updating role and name...")
            p_insert = (
                db.table("profiles")
                .update({"role": "candidate", "name": name, "avatar_url": None})
                .eq("id", user_id)
                .execute()
            )
        else:
            print(f"Inserting new profile row for candidate {name}...")
            p_insert = (
                db.table("profiles")
                .insert(
                    {
                        "id": user_id,
                        "role": "candidate",
                        "name": name,
                        "avatar_url": None,
                    }
                )
                .execute()
            )
        profile = p_insert.data[0]

    # 3. Create/Ensure Candidate Detail Row
    c_res = db.table("candidates").select("*").eq("profile_id", profile["id"]).execute()
    if c_res.data:
        cand = c_res.data[0]
        print(f"Candidate details for {name} already exists: {cand['id']}")
    else:
        c_id = str(uuid.uuid4())
        print(f"Creating candidate details for {name} with ID: {c_id}")
        c_insert = (
            db.table("candidates")
            .insert(
                {
                    "id": c_id,
                    "profile_id": profile["id"],
                    "title": title,
                    "skills": skills,
                    "salary_min": salary_min,
                    "remote_pref": True,
                    "github_url": github_url,
                    "portfolio_url": portfolio_url,
                    "availability": "immediate",
                }
            )
            .execute()
        )
        cand = c_insert.data[0]

    return cand


def create_or_get_recruiter(
    name: str,
    company: str,
    email: str,
):
    db = get_db()

    # 1. Check if profile already exists in DB by name
    p_res = (
        db.table("profiles")
        .select("*")
        .eq("role", "recruiter")
        .eq("name", name)
        .execute()
    )
    if p_res.data:
        profile = p_res.data[0]
        print(f"Profile for recruiter {name} already exists: {profile['id']}")
        
        # Try signing in to set active session
        print(f"Signing in as recruiter {name} ({email}) to set client auth context...")
        try:
            db.auth.sign_in_with_password(
                credentials={"email": email, "password": "Password123!"}
            )
            print(f"Successfully signed in as recruiter {name}")
        except Exception as login_err:
            print(f"Sign in failed for existing profile: {login_err}")
    else:
        # 2. Register recruiter via Auth system
        print(f"Signing up auth user for recruiter {name} with email: {email}")
        user_id = None
        try:
            auth_res = db.auth.sign_up(
                credentials={"email": email, "password": "Password123!"}
            )
            user_id = auth_res.user.id
            print(f"Created Auth User for recruiter {name}: {user_id}")
        except Exception as auth_err:
            print(f"Auth registration failed or user already exists: {auth_err}")

        # Try signing in to set active session
        print(f"Signing in as recruiter {name} ({email}) to set client auth context...")
        try:
            login_res = db.auth.sign_in_with_password(
                credentials={"email": email, "password": "Password123!"}
            )
            user_id = login_res.user.id
            print(f"Successfully signed in as recruiter {name}: {user_id}")
        except Exception as login_err:
            print(f"Sign in failed: {login_err}")
            if user_id is None:
                pf_res = db.table("profiles").select("*").eq("name", name).execute()
                if pf_res.data:
                    profile = pf_res.data[0]
                    user_id = profile["id"]
                else:
                    raise login_err

        # Check if profile row already exists (trigger might have created it)
        p_check = db.table("profiles").select("*").eq("id", user_id).execute()
        if p_check.data:
            print(f"Profile row for recruiter {name} already exists, updating role and name...")
            p_insert = (
                db.table("profiles")
                .update({"role": "recruiter", "name": name, "avatar_url": None})
                .eq("id", user_id)
                .execute()
            )
        else:
            print(f"Inserting new profile row for recruiter {name}...")
            p_insert = (
                db.table("profiles")
                .insert(
                    {
                        "id": user_id,
                        "role": "recruiter",
                        "name": name,
                        "avatar_url": None,
                    }
                )
                .execute()
            )
        profile = p_insert.data[0]

    # 3. Create/Ensure Recruiter Detail Row
    r_res = db.table("recruiters").select("*").eq("profile_id", profile["id"]).execute()
    if r_res.data:
        recruiter = r_res.data[0]
        print(f"Recruiter details for {name} already exists: {recruiter['id']}")
    else:
        r_id = str(uuid.uuid4())
        print(f"Creating recruiter details for {name} with ID: {r_id}")
        r_insert = (
            db.table("recruiters")
            .insert(
                {
                    "id": r_id,
                    "profile_id": profile["id"],
                    "company": company,
                    "position": "Hiring Manager",
                    "salary_range_min": 10000,
                    "salary_range_max": 20000,
                    "remote_policy": "hybrid",
                }
            )
            .execute()
        )
        recruiter = r_insert.data[0]

    return recruiter


def main():
    db = get_db()

    print("--- Seeding Single Mock Data into Supabase ---")

    # Reset/clear previous client auth session to start clean
    try:
        db.auth.sign_out()
    except Exception:
        pass

    # 1. Seed Recruiter Zoro (and sign in as Zoro)
    zoro = create_or_get_recruiter(
        name="Zoro",
        company="TechCorp",
        email="zoro_swordsman@gmail.com",
    )

    # 2. Seed Job DevOps Intern (while signed in as Zoro)
    job_res = db.table("jobs").select("*").eq("title", "DevOps Intern").execute()
    if job_res.data:
        job = job_res.data[0]
        print(f"Job 'DevOps Intern' already exists: {job['id']}")
    else:
        job_id = str(uuid.uuid4())
        print(f"Creating job DevOps Intern with ID: {job_id}")
        job_insert = db.table("jobs").insert({
            "id": job_id,
            "recruiter_id": zoro["id"],
            "company": "TechCorp",
            "title": "DevOps Intern",
            "location": "Kathmandu",
            "remote_policy": "hybrid",
            "salary_min": 10000,
            "salary_max": 15000,
            "salary_public": True,
            "stack": ["Docker", "Linux", "CI/CD"],
            "description": "You will be working on DevOps automation.",
            "culture_signals": "4 days per week",
            "experience_required": "0",
            "status": "active",
        }).execute()
        job = job_insert.data[0]

    # 3. Seed Candidate Luffy (and sign in as Luffy)
    luffy = create_or_get_candidate(
        name="Luffy",
        title="DevOps Intern",
        skills=["Docker", "Linux", "CI/CD"],
        salary_min=15000,
        email="luffy_mugiwara@gmail.com",
    )

    # 4. Seed Negotiation (with backend helper override policy)
    neg_res = (
        db.table("negotiations")
        .select("*")
        .eq("candidate_id", luffy["id"])
        .eq("recruiter_id", zoro["id"])
        .execute()
    )
    if neg_res.data:
        neg = neg_res.data[0]
        print(f"Negotiation between Luffy and Zoro already exists: {neg['id']}")
    else:
        neg_id = str(uuid.uuid4())
        print(f"Creating negotiation with ID: {neg_id}")
        neg_insert = db.table("negotiations").insert({
            "id": neg_id,
            "candidate_id": luffy["id"],
            "recruiter_id": zoro["id"],
            "status": "active",
            "fit_score": 78,
            "candidate_notes": f"job_id:{job['id']}",
            "recruiter_notes": "Active dialogue ongoing",
        }).execute()
        neg = neg_insert.data[0]

    # 5. Seed Chat Messages (with backend helper override policy)
    msg_res = db.table("messages").select("*").eq("negotiation_id", neg["id"]).execute()
    if msg_res.data:
        print(f"Messages already exist for negotiation: {neg['id']}")
    else:
        print("Inserting dialogue messages...")
        messages_to_seed = [
            {
                "sender_role": "recruiter",
                "content": "Hello Luffy! I've reviewed your profile for the DevOps Intern role at TechCorp. What are your salary expectations for this position?"
            },
            {
                "sender_role": "candidate",
                "content": "Hello Zoro! Thank you for considering my application. Based on my skills with Docker and Linux, my minimum salary expectation is $15,000. I am also interested in learning about mentorship opportunities."
            },
            {
                "sender_role": "recruiter",
                "content": "Thanks for sharing. Our standard intern package starts at $10,000, but we do have some flexibility up to $13,000 for candidates with strong hands-on experience. How does that sound?"
            },
            {
                "sender_role": "candidate",
                "content": "I understand. I could align with a package around $14,000 if we can include a flexible remote schedule of 2 days a week. What do you think?"
            }
        ]
        
        for m in messages_to_seed:
            db.table("messages").insert({
                "id": str(uuid.uuid4()),
                "negotiation_id": neg["id"],
                "sender_role": m["sender_role"],
                "content": m["content"]
            }).execute()
        print("Dialogue messages seeded successfully.")

    # Clean up auth session back to clean state
    try:
        db.auth.sign_out()
    except Exception:
        pass

    print("\n--- Seeding Completed Successfully ---")


if __name__ == "__main__":
    main()
