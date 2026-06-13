# recruitx — AI-Powered Autonomous Hiring, Negotiated by Agents

> 🦌 Built at **[DeerHack 2026](https://deerhack.deerwalk.edu.np/)** by **Team Resham Firiri**

recruitx is a full-stack platform where AI agents negotiate job offers autonomously — no cover letters, no back-and-forth emails. A candidate's AI agent talks directly to a recruiter's AI agent, aligns on salary, remote policy, and culture fit, then schedules the interview — all without human intervention.

---

## 🚀 What We Built

| Layer | Tech | Role |
|-------|------|------|
| Frontend | Next.js 15 + Tailwind CSS | Candidate & Recruiter dashboards, Job Board, Landing |
| Backend | FastAPI + Python | REST API, WebSocket server, Google Calendar integration |
| Agents | LangGraph + OpenAI GPT-4o | Autonomous A2A negotiation state machines |
| Database | Supabase (Postgres) | Auth, profiles, jobs, negotiations, messages |
| Voice | Deepgram Conversational AI | Real-time voice agent joining Google Meet |

---

## ✨ Key Features

- **Agent-to-Agent Negotiation** — Candidate and Recruiter agents run LangGraph graphs, exchange structured offers, apply guardrails, and converge on salary, equity, and start date
- **Live Playback Drawer** — Recruiters watch the full A2A conversation transcript with fit scores in real time
- **Auto-Scheduling** — When agents agree, Google Calendar events + Meet links are created automatically
- **Resume PDF Parser** — Drop a PDF; AI extracts skills, salary floor, title, and bio instantly
- **GitHub OAuth Integration** — Candidate agents verify real repo metadata to strengthen negotiation position
- **Deepgram Voice Bot** — Playwright-powered bot joins a Google Meet and speaks using Deepgram's voice API

---

## 🏗️ Project Structure

```
recruitx/
├── backend/              # FastAPI server
│   ├── agents/           # LangGraph candidate + recruiter negotiation graphs
│   ├── api/              # REST routes (auth, jobs, negotiations, calendar...)
│   ├── db/               # Supabase client + schema
│   └── main.py           # App entry point
├── frontend/             # Next.js app
│   ├── src/app/          # Pages (dashboard, jobs, negotiations, auth)
│   ├── src/components/   # UI components (Hero, Sidebar, TopBar, KanbanBoard...)
│   └── src/lib/          # API client, Supabase client
└── docs/                 # Architecture notes, pitch, progress logs
```

---

## ⚙️ Quick Start

```bash
# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env        # fill in your keys
uvicorn main:app --reload

# Frontend
cd frontend
npm install
cp .env.local.example .env.local   # fill in your keys
npm run dev
```

### Required Environment Variables

**Backend `.env`**
```
SUPABASE_URL=...
SUPABASE_KEY=...
OPENAI_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

**Frontend `.env.local`**
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 👥 Team Resham Firiri

| Name | Role |
|------|------|
| Viraj Sawad | Full-stack, Frontend, Integration |
| Pratik Ban | Backend agents, LangGraph, API |

---

## 🦌 DeerHack 2026

Built in 48 hours at DeerHack 2026 — [deerhack.deerwalk.edu.np](https://deerhack.deerwalk.edu.np/)

---

## 📄 License

MIT
