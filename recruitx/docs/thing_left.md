# Future Improvements & Roadmap Ideas

While the core ecosystem of recruitx is fully operational, the following ideas represent paths for upgrading the marketplace to a production scale:

---

## 📈 Planned Future Enhancements

### 1. 📧 Production Email Domain Verification
* **Current State**: Uses Resend API sandbox mode, which logs emails or sends them only to registered account developers.
* **Next Step**: Add a custom domain (e.g. `domain.com`) in the Resend dashboard, verify DNS MX records, and configure a public sender email address (`hiring@recruitx.com`) to support real email alerts to anyone.

### 2. 📅 Full Google Calendar OAuth Integration
* **Current State**: Uses a mock calendar connection connector to register calendar credentials locally in settings.
* **Next Step**: Register an OAuth app credentials consent screen inside Google Cloud Platform console, configure redirect URLs to the backend service, and exchange real Google refresh tokens to inject scheduled meetings directly into real Google Calendars.

### 3. 🧠 Multi-turn Token Caching (LLM Optimizations)
* **Current State**: LangGraph reads complete turn-taking histories on every message turn, which consumes prompt tokens.
* **Next Step**: Integrate LLM caching features (using LangChain's memory cache or Redis memory cache) to prevent re-submitting identical context prefixes during multi-turn negotiations.

### 4. 📊 Enhanced Analytics Visualizations
* **Current State**: Displays custom CSS-based bar indicators and statistical summary grids.
* **Next Step**: Integrate React graphing libraries (like `Recharts` or `Chart.js`) to display real-time line charts mapping negotiation histories, salary distributions, and monthly fit score correlations.

### 5. 🤖 Automated cron matching scans
* **Current State**: Relying on manual initiate match triggers in the Recruiter Candidates Directory or manually starting background queues.
* **Next Step**: Schedule Celery Beat recurring cron schedules (e.g. `*/10 * * * *` to run every 10 minutes) that check newly modified job postings and Candidate profiles to auto-trigger agent negotiations.
