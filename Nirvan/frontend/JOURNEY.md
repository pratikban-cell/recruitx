# recruitx — Build Journey

## Overview

**recruitx** is an Agent-to-Agent (A2A) hiring platform. AI agents negotiate on behalf of candidates and recruiters — screening, salary discussion, dealbreaker checks, and booking — so humans only meet when fit is confirmed.

---

## Phase 1: Landing Page (Design Iterations)

### Iteration 1 — Dark Theme (Discarded)
- Dark background with particle network canvas animation
- Rejected: too heavy, not inspiring

### Iteration 2 — Stark White / Ramp Style (Discarded)
- Light theme, Ramp-style short punchy copy
- Rejected: too plain, no glass effects, lacked depth

### Iteration 3 — Warm Light + Glass (Current Base)
- Warm off-white (`#fafaf9`), teal accent (`#0d9488`)
- Glass navbar, shadow system, breathing glow orbs
- Animated heading with word-by-word stagger + blur + rotateX
- Per-side chat demo, typing indicator, fit-score panel, counter animation

### Iteration 4 — Attio Style (Current)
- Color palette shifted to Attio's brand (Shark near-black, Dodger Blue accent)
- All sections rewritten to content + animation side-by-side grid pattern
- Sections: Hero, LogoWall, ProblemSection, Stats, HowItWorks, TwoSides, Features, TransparencyLayer, Pricing, CtaSection

---

## Phase 2: Supabase App (Auth + Dashboards)

### Stack
- **Next.js 16.2.6** (App Router, Turbopack)
- **Supabase** (Auth, PostgreSQL, RLS)
- **Tailwind CSS v4**, **Framer Motion**, **Geist** font

### Database Schema (`supabase-schema.sql`)
- `profiles`, `candidates`, `recruiters` — user data
- `jobs` — job listings with remote_policy, salary, stack, culture signals
- `negotiations` — matches with status, fit_score
- `messages` — agent-to-agent messages
- Triggers: auto-create profile on signup, updated_at timestamps
- RLS: users see only their own data and their negotiations

### Routes
| Route | Description |
|-------|------------|
| `/` | Landing page |
| `/auth` | Login / signup with role selection |
| `/jobs` | Public job board with search + filter |
| `/jobs/[id]` | Job detail with "Let agent handle this" |
| `/dashboard/candidate` | Overview, stats, agent activity feed, matched jobs |
| `/dashboard/candidate/negotiations` | All negotiations with fit scores |
| `/dashboard/candidate/calendar` | Interview calendar (placeholder) |
| `/dashboard/candidate/analytics` | Analytics (placeholder) |
| `/dashboard/candidate/settings` | Candidate profile form + Activate Agent |
| `/dashboard/recruiter` | Recruiter overview |
| `/dashboard/recruiter/jobs` | Recruiter's job listings |
| `/dashboard/recruiter/jobs/new` | Create job (chat with agent OR manual form) |
| `/dashboard/recruiter/candidates` | Candidate pool (placeholder) |
| `/dashboard/recruiter/analytics` | Analytics (placeholder) |
| `/dashboard/recruiter/calendar` | Calendar (placeholder) |
| `/dashboard/recruiter/settings` | Recruiter settings |
| `/negotiations/[id]` | Negotiation chat view |

---

## Phase 3: Backend (FastAPI + A2A Agents + LangGraph)

### Stack
- **Python 3.10+**, **FastAPI**, **uvicorn**
- **LangGraph v1.2.0** for agent state machine orchestration
- **A2A SDK v1.0** (`a2a-sdk[http-server]`) for Agent-to-Agent protocol
- **OpenAI** (`gpt-4o-mini`) for LLM calls
- **Supabase** client for candidate pool queries

### Structure
```
backend/
├── main.py                           # FastAPI app, mounts A2A routes
├── .env                              # Supabase + OpenAI keys
├── agents/
│   ├── candidate/
│   │   ├── graph.py                  # Candidate StateGraph
│   │   └── executor.py               # CandidateAgentExecutor
│   ├── recruiter/
│   │   ├── graph.py                  # Recruiter StateGraph
│   │   └── executor.py               # RecruiterAgentExecutor
│   └── negotiation/
│       └── protocol.py               # Fit score calculator, message types
├── api/
│   ├── jobs.py                       # Job CRUD endpoints
│   └── ws.py                         # WebSocket negotiation feed
└── db/
    └── client.py                     # Supabase client factory
```

### LangGraph Agents

**Candidate Agent** (nodes):
1. `build_profile` — LLM extracts preferences, dealbreakers, salary from raw input
2. `verify` — placeholder (GitHub/portfolio API check)
3. `negotiate` — LLM responds to recruiter, aware of fit score
4. `schedule` / `escalate` — terminal nodes

**Recruiter Agent** (nodes):
1. `analyze_role` — LLM extracts title, skills, salary, must-haves from raw input
2. `screen` — computes `calculate_fit_score()` per candidate using weighted formula
3. `negotiate` — LLM responds to candidate, includes fit score in message
4. `schedule` — terminal node

### Fit Score Formula
- Dealbreaker clear: 30%
- Skill verified match: 25%
- Salary overlap: 20%
- Priority alignment: 15%
- Culture signals: 10%

### A2A Protocol Endpoints
| Endpoint | Purpose |
|----------|---------|
| `POST /a2a/candidate/jsonrpc` | Candidate agent JSON-RPC |
| `GET /a2a/candidate` | Candidate agent card |
| `POST /a2a/recruiter/jsonrpc` | Recruiter agent JSON-RPC |
| `GET /a2a/recruiter` | Recruiter agent card |
| `WS /ws/negotiation/{room_id}` | Live negotiation feed |

### Executor Behaviour
- **RecruiterExecutor**: on `execute()`, queries Supabase `candidates` table and populates pipeline with verified_skills, salary, preferences — so `screen` node has real data to score
- **CandidateExecutor**: on `execute()`, passes raw input through the graph to build a structured profile

---

## Phase 4: Frontend-Backend Integration

### API Client (`src/lib/api.ts`)
- `candidateSendMessage()` / `candidateGetTask()` — A2A JSON-RPC
- `recruiterSendMessage()` / `recruiterGetTask()` — A2A JSON-RPC
- `listJobs()` / `getJob()` / `createJob()` — REST CRUD
- `createNegotiationWebSocket()` — WS connection
- `getAgentCard()` — agent metadata

### Integration Points
- **Job detail page**: "Let agent handle this" button calls `candidateSendMessage()` with job info, then redirects to negotiations
- **Candidate settings**: "Activate Agent" button builds a profile string from form fields and sends it to the candidate agent via A2A
- **Negotiations dashboard**: fetches from Supabase + backend fallback

---

## Project Structure (Current)

```
recruitx/
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js pages (landing, auth, jobs, dashboards)
│   │   ├── components/       # UI components (Hero, Stats, JobCard, etc.)
│   │   └── lib/              # api.ts, mock-data.ts, supabase-client.ts, supabase-server.ts
│   ├── .env.local            # Supabase URL + anon key, API URL
│   └── package.json
├── backend/
│   ├── main.py               # FastAPI app
│   ├── .env                  # Supabase + OpenAI keys
│   ├── agents/               # LangGraph state machines
│   ├── api/                  # REST + WebSocket endpoints
│   └── db/                   # Supabase client
└── supabase-schema.sql       # Full DB schema
```

---

## Remaining

### Stubbed / Not Built
- **`run_verification`** — GitHub API / portfolio skill verification (currently returns empty)
- **Candidate pool A2A discovery** — currently queries Supabase only, no A2A-based discovery
- **Real scheduling** — calendar API integration (mock only)
- **Backend auth middleware** — A2A/REST endpoints unprotected (no JWT validation)
- **Negotiation detail page** (`/negotiations/[id]`) — route exists, UI not reviewed
- **Recruiter candidate screening UI** — reviewing/scoring candidates in dashboard
- **Tests** — no test framework wired up
- **Deployment config** — Docker / Vercel / Railway configs missing

### Polish / Nice-to-Have
- Real-time WebSocket messages in negotiation chat
- Email notifications on negotiation progress
- Admin dashboard
- Rate limiting / DDOS protection on A2A endpoints
- Agent memory / checkpoint persistence (currently in-memory)

---

## To Run Locally

```bash
# Terminal 1 — Backend
cd backend
python -m uvicorn main:app --reload

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Requires `.env` files with Supabase credentials and `OPENAI_API_KEY`.
