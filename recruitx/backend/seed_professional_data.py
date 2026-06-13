import sys
import uuid
import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from db.client import get_db

def create_or_get_user(name: str, email: str, role: str, company: str = "") -> dict:
    db = get_db()
    
    # 1. Sign up auth user
    user_id = None
    try:
        auth_res = db.auth.sign_up(credentials={"email": email, "password": "Password123!"})
        user_id = auth_res.user.id
        print(f"Created Auth User for {name}: {user_id}")
    except Exception as e:
        print(f"User {name} might already exist in auth: {e}")
        
    # Sign in to get user session context (sets active session)
    try:
        login_res = db.auth.sign_in_with_password(credentials={"email": email, "password": "Password123!"})
        user_id = login_res.user.id
        print(f"Signed in as {name} ({email})")
    except Exception as e:
        print(f"Signing in failed, searching by name: {e}")
        p_res = db.table("profiles").select("id").eq("name", name).execute()
        if p_res.data:
            user_id = p_res.data[0]["id"]
            print(f"Found existing profile ID: {user_id}")
        else:
            # Fallback random uuid if it fails entirely
            user_id = str(uuid.uuid4())
            print(f"Fallback generated ID: {user_id}")

    # 2. Check/Upsert profile
    p_check = db.table("profiles").select("*").eq("id", user_id).execute()
    if p_check.data:
        p_insert = db.table("profiles").update({"role": role, "name": name}).eq("id", user_id).execute()
    else:
        p_insert = db.table("profiles").insert({"id": user_id, "role": role, "name": name}).execute()
        
    profile = p_insert.data[0]

    # 3. Create role-specific detail row
    if role == "candidate":
        c_check = db.table("candidates").select("*").eq("profile_id", profile["id"]).execute()
        if not c_check.data:
            c_id = str(uuid.uuid4())
            db.table("candidates").insert({
                "id": c_id,
                "profile_id": profile["id"],
                "title": "Developer",
                "skills": [],
                "salary_min": 80000,
                "remote_pref": True,
                "availability": "immediate",
            }).execute()
    else:
        r_check = db.table("recruiters").select("*").eq("profile_id", profile["id"]).execute()
        if not r_check.data:
            r_id = str(uuid.uuid4())
            db.table("recruiters").insert({
                "id": r_id,
                "profile_id": profile["id"],
                "company": company or "Partner Corp",
                "position": "Hiring Manager",
                "salary_range_min": 100000,
                "salary_range_max": 200000,
                "remote_policy": "hybrid",
            }).execute()

    return profile

def main():
    db = get_db()
    print("--- Seeding Professional Demonstration Data ---")

    # Clear session
    try:
        db.auth.sign_out()
    except Exception:
        pass

    # 1. Create users (auth registration)
    emma_profile = create_or_get_user("Emma Watson", "emma.watson@logpoint.com", "recruiter", "Logpoint")
    niranjan_profile = create_or_get_user("Niranjan Shrestha", "niranjan@leapfrog.com", "recruiter", "Leapfrog")

    # Candidate 1: Sarah Jenkins
    sarah_profile = create_or_get_user("Sarah Jenkins", "sarah.jenkins@gmail.com", "candidate")
    # Candidate 2: Alex Mercer
    alex_profile = create_or_get_user("Alex Mercer", "alex.mercer@gmail.com", "candidate")
    # Candidate 3: Priya Sharma
    priya_profile = create_or_get_user("Priya Sharma", "priya.sharma@gmail.com", "candidate")
    # Candidate 4: David Chen
    david_profile = create_or_get_user("David Chen", "david.chen@gmail.com", "candidate")

    # 2. Update Emma's Job
    # Sign in as Emma
    print("Signing in as Emma Watson to create job...")
    db.auth.sign_in_with_password(credentials={"email": "emma.watson@logpoint.com", "password": "Password123!"})
    emma = db.table("recruiters").select("*").eq("profile_id", emma_profile["id"]).single().execute().data

    job1_id = str(uuid.uuid4())
    j1_check = db.table("jobs").select("*").eq("title", "Senior Frontend Architect").execute()
    if j1_check.data:
        job1 = j1_check.data[0]
        print(f"Job Senior Frontend Architect already exists: {job1['id']}")
    else:
        job1 = db.table("jobs").insert({
            "id": job1_id,
            "recruiter_id": emma["id"],
            "company": "Logpoint",
            "title": "Senior Frontend Architect",
            "location": "Kathmandu",
            "remote_policy": "hybrid",
            "salary_min": 110000,
            "salary_max": 140000,
            "salary_public": True,
            "stack": ["React", "TypeScript", "Next.js"],
            "description": "Design and architect premium frontend experiences for cybersecurity log analysis.",
            "culture_signals": "Hybrid onsite - 3 days per week",
            "experience_required": "5",
            "status": "active",
        }).execute().data[0]
        print(f"Created job Senior Frontend Architect: {job1['id']}")

    # 3. Update Niranjan's Job
    # Sign in as Niranjan
    print("Signing in as Niranjan Shrestha to create job...")
    db.auth.sign_in_with_password(credentials={"email": "niranjan@leapfrog.com", "password": "Password123!"})
    niranjan = db.table("recruiters").select("*").eq("profile_id", niranjan_profile["id"]).single().execute().data

    job2_id = str(uuid.uuid4())
    j2_check = db.table("jobs").select("*").eq("title", "AI Agent Developer").execute()
    if j2_check.data:
        job2 = j2_check.data[0]
        print(f"Job AI Agent Developer already exists: {job2['id']}")
    else:
        job2 = db.table("jobs").insert({
            "id": job2_id,
            "recruiter_id": niranjan["id"],
            "company": "Leapfrog",
            "title": "AI Agent Developer",
            "location": "Kathmandu",
            "remote_policy": "remote",
            "salary_min": 130000,
            "salary_max": 180000,
            "salary_public": True,
            "stack": ["Python", "LangChain", "OpenAI API", "LangGraph"],
            "description": "Build agentic LLM workflows and multi-agent systems.",
            "culture_signals": "Remote friendly - flexible timing",
            "experience_required": "2",
            "status": "active",
        }).execute().data[0]
        print(f"Created job AI Agent Developer: {job2['id']}")

    # 4. Update Candidate Profiles (sign in as each candidate to update)
    print("Updating candidate profiles...")
    # Sarah
    db.auth.sign_in_with_password(credentials={"email": "sarah.jenkins@gmail.com", "password": "Password123!"})
    db.table("candidates").update({
        "title": "Senior Frontend Engineer",
        "skills": ["React", "TypeScript", "TailwindCSS", "Next.js", "Redux"],
        "salary_min": 120000,
        "remote_pref": True,
        "github_url": "https://github.com/sarahjenkins-dev",
        "portfolio_url": "https://sarahjenkins.dev",
        "availability": "immediate",
    }).eq("profile_id", sarah_profile["id"]).execute()
    sarah = db.table("candidates").select("*").eq("profile_id", sarah_profile["id"]).single().execute().data

    # Alex
    db.auth.sign_in_with_password(credentials={"email": "alex.mercer@gmail.com", "password": "Password123!"})
    db.table("candidates").update({
        "title": "Backend Engineer",
        "skills": ["Python", "FastAPI", "PostgreSQL", "Redis", "Docker"],
        "salary_min": 130000,
        "remote_pref": True,
        "github_url": "https://github.com/alexmercer-dev",
        "portfolio_url": "https://alexmercer.dev",
        "availability": "30 days notice",
    }).eq("profile_id", alex_profile["id"]).execute()
    alex = db.table("candidates").select("*").eq("profile_id", alex_profile["id"]).single().execute().data

    # Priya
    db.auth.sign_in_with_password(credentials={"email": "priya.sharma@gmail.com", "password": "Password123!"})
    db.table("candidates").update({
        "title": "AI Developer",
        "skills": ["Python", "PyTorch", "LangChain", "OpenAI API", "LangGraph"],
        "salary_min": 160000,
        "remote_pref": True,
        "github_url": "https://github.com/priyasharma-ai",
        "portfolio_url": "https://priyasharma.ai",
        "availability": "immediate",
    }).eq("profile_id", priya_profile["id"]).execute()
    priya = db.table("candidates").select("*").eq("profile_id", priya_profile["id"]).single().execute().data

    # David
    db.auth.sign_in_with_password(credentials={"email": "david.chen@gmail.com", "password": "Password123!"})
    db.table("candidates").update({
        "title": "DevOps Architect",
        "skills": ["Kubernetes", "Docker", "AWS", "Terraform", "CI/CD"],
        "salary_min": 150000,
        "remote_pref": False,
        "github_url": "https://github.com/davidchen-ops",
        "portfolio_url": "https://davidchen.io",
        "availability": "90 days notice",
    }).eq("profile_id", david_profile["id"]).execute()
    david = db.table("candidates").select("*").eq("profile_id", david_profile["id"]).single().execute().data

    # 5. Create Negotiations (sign in as the candidate to insert)
    print("Creating negotiations...")
    # Neg 1: Sarah Jenkins with Emma Watson
    db.auth.sign_in_with_password(credentials={"email": "sarah.jenkins@gmail.com", "password": "Password123!"})
    neg1_id = str(uuid.uuid4())
    n1_check = db.table("negotiations").select("*").eq("candidate_id", sarah["id"]).eq("recruiter_id", emma["id"]).execute()
    if not n1_check.data:
        db.table("negotiations").insert({
            "id": neg1_id,
            "candidate_id": sarah["id"],
            "recruiter_id": emma["id"],
            "status": "scheduled",
            "fit_score": 88,
            "candidate_notes": f"job_id:{job1['id']}",
            "recruiter_notes": "Highly qualified frontend architect. Ready for panel interview.",
        }).execute()
        # Seed chat
        messages = [
            {"sender_role": "recruiter", "content": "Hello Sarah! Your candidate agent suggested a base salary target of NPR 125,000. That fits our salary range ceiling of NPR 140,000 perfectly. Are you comfortable with our 3-days-a-week hybrid policy in Kathmandu?"},
            {"sender_role": "candidate", "content": "Hello Emma! Yes, my agent configured my preferences to align with hybrid. Kathmandu office is completely accessible for me."},
            {"sender_role": "recruiter", "content": "Excellent! I have scheduled our technical panel interview connection. See you Tuesday!"}
        ]
        for idx, m in enumerate(messages):
            db.table("messages").insert({
                "id": str(uuid.uuid4()),
                "negotiation_id": neg1_id,
                "sender_role": m["sender_role"],
                "content": m["content"],
                "created_at": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=30 - idx * 5)).isoformat()
            }).execute()
        print("Created negotiation 1 (Sarah & Emma)")

    # Neg 2: Alex Mercer with Niranjan Shrestha
    db.auth.sign_in_with_password(credentials={"email": "alex.mercer@gmail.com", "password": "Password123!"})
    neg2_id = str(uuid.uuid4())
    n2_check = db.table("negotiations").select("*").eq("candidate_id", alex["id"]).eq("recruiter_id", niranjan["id"]).execute()
    if not n2_check.data:
        db.table("negotiations").insert({
            "id": neg2_id,
            "candidate_id": alex["id"],
            "recruiter_id": niranjan["id"],
            "status": "active",
            "fit_score": 82,
            "candidate_notes": f"job_id:{job2['id']}",
            "recruiter_notes": "Active dialogue ongoing - backend candidate",
        }).execute()
        # Seed chat
        messages = [
            {"sender_role": "recruiter", "content": "Hello Alex! I am Niranjan from Leapfrog. We are reviewing your backend credentials for our AI Agent Developer role. Can you tell us about your experience with FastAPI?"},
            {"sender_role": "candidate", "content": "Hi Niranjan! I have designed and deployed FastAPI backends for 3 microservices at my previous company, including a message queue integration with Redis."}
        ]
        for idx, m in enumerate(messages):
            db.table("messages").insert({
                "id": str(uuid.uuid4()),
                "negotiation_id": neg2_id,
                "sender_role": m["sender_role"],
                "content": m["content"],
                "created_at": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=15 - idx * 5)).isoformat()
            }).execute()
        print("Created negotiation 2 (Alex & Niranjan)")

    # Neg 3: Priya Sharma with Emma Watson (Rejected)
    db.auth.sign_in_with_password(credentials={"email": "priya.sharma@gmail.com", "password": "Password123!"})
    neg3_id = str(uuid.uuid4())
    n3_check = db.table("negotiations").select("*").eq("candidate_id", priya["id"]).eq("recruiter_id", emma["id"]).execute()
    if not n3_check.data:
        reason = "Salary expectation mismatch. Candidate target salary (NPR 160,000) exceeds Logpoint ceiling budget of NPR 140,000."
        cats = ["salary_mismatch"]
        notes = f"REJECT_INFO:{{\"rejection_reasons\": \"{reason}\", \"rejection_categories\": {cats}}}"
        db.table("negotiations").insert({
            "id": neg3_id,
            "candidate_id": priya["id"],
            "recruiter_id": emma["id"],
            "status": "rejected",
            "fit_score": 45,
            "candidate_notes": f"job_id:{job1['id']}",
            "recruiter_notes": notes,
        }).execute()
        print("Created negotiation 3 (Priya & Emma - Rejected)")

    # Neg 4: David Chen with Emma Watson (Rejected)
    db.auth.sign_in_with_password(credentials={"email": "david.chen@gmail.com", "password": "Password123!"})
    neg4_id = str(uuid.uuid4())
    n4_check = db.table("negotiations").select("*").eq("candidate_id", david["id"]).eq("recruiter_id", emma["id"]).execute()
    if not n4_check.data:
        reason = "Availability mismatch & notice period. Candidate notice period is 90 days, but Logpoint requires immediate joiner within 30 days. Also, candidate requires remote work, but the job requires hybrid Kathmandu."
        cats = ["availability_mismatch"]
        notes = f"REJECT_INFO:{{\"rejection_reasons\": \"{reason}\", \"rejection_categories\": {cats}}}"
        db.table("negotiations").insert({
            "id": neg4_id,
            "candidate_id": david["id"],
            "recruiter_id": emma["id"],
            "status": "rejected",
            "fit_score": 35,
            "candidate_notes": f"job_id:{job1['id']}",
            "recruiter_notes": notes,
        }).execute()
        print("Created negotiation 4 (David & Emma - Rejected)")

    # Clean up auth session
    try:
        db.auth.sign_out()
    except Exception:
        pass

    print("--- Professional Seeding Completed Successfully ---")

if __name__ == "__main__":
    main()
