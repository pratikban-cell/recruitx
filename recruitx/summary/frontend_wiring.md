# Frontend Wiring (Mock Data & Simulations)

These parts of the frontend application represent interactive wiring and visual fallbacks designed for local development, hackathon pitching, and demonstration:

## 1. Mock Calendar & Settings
- **Calendar Scheduler Visuals**: When Google Calendar is unlinked, the frontend uses an interactive visual mock scheduler allowing developers to select mock interview slots.
- **Pre-populated Mock Credentials**: Settings displays pre-seeded mock keys (e.g. Gmail / OAuth labels) to demonstrate setup fields.

## 2. Rejection Insights Demo Mode
- **Demo Pitch Mode Toggle**: If a candidate profile does not have 3+ rejections, they will see an "Insufficient Data" warning. An interactive **Demo Pitch Mode** toggle allows judges/users to simulate the insights dashboard instantly with a pre-seeded set of mock rejections from Stripe, TechCorp, Logpoint, and WebFlow.
- **Skill Map Target Line**: In Panel 3, the target job demand boundary (grey vertical threshold line) is rendered using candidate verified/claimed skills compared against average job requirements from job mock listings.

## 3. Analytics Chart placeholders
- **Custom CSS Indicators**: Analytics pages render using dynamic, customized TailwindCSS/CSS layouts, statistics summary badges, and glassmorphic progress blocks rather than loading heavy charting libraries (like Recharts or Chart.js).

## 4. Live DB Connection Toggles
- **Live DB Mode Toggle**: Allows developers to switch the candidate insights board to query the FastAPI endpoint live, parsing real database entries and executing actual OpenAI model calls.
