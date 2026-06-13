# recruitx: Autonomous A2A Talent Marketplace

recruitx is an Agent-to-Agent hiring marketplace where candidate and recruiter agents can match, negotiate compensation/work preferences, support human steering, and schedule interviews.

## Project layout

- [`backend/`](backend/) — FastAPI service, A2A agent cards/routes, negotiation orchestration, Supabase access, calendar/email integrations, and Celery task dispatch.
- [`frontend/`](frontend/) — Next.js 16 app with landing page, auth, candidate/recruiter dashboards, negotiation room, calendar/settings flows, and Supabase client integration.
- [`docs/`](docs/) — product concept, hackathon pitch, implementation roadmap, status notes, and future optimization backlog.

## Quick start

### Backend

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend expects `NEXT_PUBLIC_API_URL=http://localhost:8000` unless configured otherwise.

## Key docs

- [`docs/HACKATHON_PITCH.md`](docs/HACKATHON_PITCH.md) — pitch and technical walkthrough.
- [`docs/idea.md`](docs/idea.md) — detailed product/agent/database blueprint.
- [`docs/status.md`](docs/status.md) — current verified status, known issues, and required configuration.
- [`docs/thing_left.md`](docs/thing_left.md) and [`docs/implement_later.md`](docs/implement_later.md) — implementation backlog and future improvements.
