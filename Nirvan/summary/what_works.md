# What Works (Operational Features)

Here is a summary of all backend features, agent engines, and database systems that are fully functional and integrated:

## 1. Authentication & Session Security
- **Supabase Auth Integration**: Fully integrated on both frontend and backend.
- **Token Authorization Guard**: Endpoints are protected with the `get_current_user` dependency, extracting JWT claims and verifying ownership of profiles and negotiations (`assert_profile_owner`, `assert_negotiation_owner`).

## 2. Candidate Resume Parsing & LangGraph Enrichment
- **PDF Extraction**: Uploading a resume PDF extracts text dynamically using `pypdf`.
- **OpenAI Parsing**: An AI Talent Sourcing agent parses the text with `gpt-4o-mini` into structured JSON (skills, salary expectations, title, remote preference, dealbreakers).
- **Candidate Profile Activation**: Runs a LangGraph state machine node to enrich the candidate's profile, format availability fields, and trigger matching scans.

## 3. Recruitment Intake & Job Creation
- **HR Intake Graph**: Recruiter intake queries details through a structured chat agent to build recruiter profiles and job postings.
- **Job Stack & Must-Haves**: Jobs are successfully written to Supabase with precise requirements and target ranges.

## 4. Matchmaking & Fit Score Engine
- **Profile Matching Scan**: Scans all candidates against active job requirements.
- **Fit Scoring Protocol**: Calculates a normalized fit score ($0$ to $100$) based on:
  - Skill overlap (verified vs claimed vs missing).
  - Compensation alignment (candidate's minimum salary floor vs recruiter's budget ceiling).
  - Work location preferences (remote vs hybrid vs onsite).
- **Dealbreaker Guards**: Automatically filters out matches that violate absolute dealbreakers (e.g. visa sponsorship, salary mismatch, or onsite requirements).

## 5. Agent-to-Agent (A2A) Negotiation Engine
- **LangGraph Negotiation Loop**: Runs recruiter and candidate agent state graphs in a simulated game-theoretic negotiation loop.
- **Real-time WebSockets**: Chat logs, status updates, and agent thoughts are streamed live via WebSockets.
- **Steering & Takeover**: Human participants can pause their agent, write custom instructions to steer the agent's behavior, or resume the automatic loop.
- **Recruiter Controls**: Recruiters can accept matches ("Select & Hire"), which auto-updates application statuses and flags jobs as filled, or reject them.

## 6. Interview Prep & Prep Room
- **Coach recruitx**: An interactive chat advisor in the candidate prep room reviews the negotiation transcript, summarizes agent performance, lists company priorities, and outputs a personalized "Cheat Sheet" for upcoming interviews.

## 7. Candidate Rejection Intelligence
- **Rejection Aggregation**: Fetches failed negotiations over the last 90 days.
- **AI Analysis Engine**: Sends reasons, categories, and targeted requirements to OpenAI to generate a structured report.
- **Self-Healing Fallback**: Gracefully handles db migration mismatches. If migration columns do not exist, it falls back to serializing/deserializing the metadata inside the `recruiter_notes` text field using a `REJECT_INFO:` JSON prefix.
- **Insights Board**: Premium frontend visualization featuring:
  - Overall rejection rate and blocker summary.
  - Rejection patterns bar chart showing company details per blocker.
  - Skill weakness map overlay showing candidates' levels compared against target market requirements.
  - Actionable ranked steps cards with links tosettings or the prep room.
