# Left to Do (Backend Integrations & Deployments)

Here are the features and tasks that need to be completed, configured, or integrated to move recruitx to a full production release:

## 1. Domain & Email Verification
- **Verify Resend Domain**: Setup DNS records (MX, TXT, SPF, DKIM) for the custom sender domain in GCP/Namecheap so that notification emails can be delivered to public addresses (currently runs in Sandbox mode).

## 2. Calendar OAuth Setup
- **Register GCP OAuth Consent Screen**: Submit the Google Cloud project for approval so that external recruiters and candidates can sign in with Google Calendar.
- **Refresh Token Exchange**: Swap temporary auth codes for long-lived refresh tokens in the database to allow the background agents to check/modify availability grids without requiring active browser sessions.

## 3. Scheduled Matching Scans (Celery Beat)
- **Automatic Matching Cron**: Currently, matching is triggered manually by candidate activation or recruiter matching scans. In production, Celery Beat or pg_cron should trigger periodic matching runs (e.g. every 10 minutes) to find new overlaps automatically.

## 4. LLM Response Caching
- **Context Caching**: LangGraph currently reads the complete conversation log history on every turn. In production, caching intermediate states (e.g. using Redis) should be set up to minimize OpenAI API latency and reduce input token costs.

## 5. Permanent Database Migration
- **Execute Migration Scripts**: The database fallback code handles missing columns by serializing data into `recruiter_notes`. Run `supabase-schema-rejection.sql` in the Supabase SQL editor to permanently create:
  - `rejection_reasons` (JSONB) on the `negotiations` table.
  - `rejection_categories` (TEXT[]) on the `negotiations` table.
  - `candidate_insights` (Table) for caching insights.
