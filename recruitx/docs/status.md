# Project Status: recruitx (A2A Marketplace)

recruitx is a working hackathon/prototype implementation with a passing production frontend build, compiling backend modules, real unittest discovery, and stricter authenticated API guards. It still needs deeper type cleanup, component decomposition, and production deployment hardening.

## Verified locally

- **Frontend build**: `npm --prefix <project-folder>/frontend run build` passes.
- **Backend compile**: `python -m compileall -q <project-folder>/backend` passes.
- **Frontend lint**: `npm --prefix <project-folder>/frontend run lint` completes with warnings only.
- **Backend tests**: `python -m unittest discover -s <project-folder>/backend -t <project-folder>/backend` runs the auth guard test suite.
- **Backend import smoke**: direct import of `test_guardrails` passes after adding `backend/tasks/__init__.py` and replacing hardcoded helper script paths.

## Known issues

- **Frontend lint warnings remain**: mostly hook dependency warnings and a few unused variables. The blocking lint errors have been resolved.
- **Type model is still loose**: `@typescript-eslint/no-explicit-any` is disabled temporarily because the prototype consumes dynamic Supabase/API payloads without generated types.
- **Directory rename successfully completed**: The workspace directory has been renamed from `arqveil` to `recruitx`.
- **Auth & Route Guards QA**: Handled and fixed the authorization bug in the `initiate-negotiation` endpoint. It now correctly allows either the candidate (clicking "Let agent handle this") or the recruiter to initiate negotiations, verifying proper token ownership for either participant.
- **Calendar/email integrations include mock paths**: Google Calendar and email flows still support mock tokens and test fallback addresses for local development.
- **Large components need decomposition**: `frontend/src/app/dashboard/recruiter/candidates/page.tsx` is over 1,000 lines, and `backend/api/negotiations.py` is about 800 lines.

## Required configuration

### Backend (`backend/.env`)

```bash
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ALLOW_DEV_AUTH_BYPASS=false
FRONTEND_BASE_URL=http://localhost:3000
CORS_ALLOW_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
USE_CELERY=false
REDIS_URL=redis://localhost:6379/0
RESEND_API_KEY=re_...
SENDER_EMAIL="recruitx Marketplace <notifications@your-domain.com>"
TEST_EMAIL_FALLBACK=verified-test@example.com
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:8000/api/calendar/callback
```

### Frontend (`frontend/.env.local`)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Local run

1. Run SQL migrations from `frontend/supabase-schema.sql`, `frontend/supabase-schema-calendar.sql`, and `frontend/supabase-schema-advanced.sql`.
2. Start backend from `backend/`: `uvicorn main:app --reload --port 8000`.
3. Start frontend from `frontend/`: `npm run dev`.
4. Optional: run Redis/Celery only when `USE_CELERY=true`; otherwise use the local background-task fallback.
