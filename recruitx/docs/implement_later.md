# recruitx Architecture & Feature Roadmap: Future Implementation Plan

This document serves as a strict technical blueprint and future architectural roadmap for **recruitx**. It captures the specifications for the real-time human-in-the-loop steering controls, as well as step-by-step pathways to resolve the five core architectural, security, and design critiques identified in our latest code audit.

---

## 🚨 Feature Specification: Agent Co-Pilot & Steering Commands (Human-in-the-Loop)

### 1. The Problem
Currently, a human recruiter or candidate can pause their autonomous agent and manually step into the chat room. However, they cannot "steer" the agent's behavior behind the scenes during the active negotiation loop (e.g., saying *"Hey agent, our budget just increased by $5k, go back and offer more"* or *"Be extremely firm on remote days"*). The human has to take over completely, rendering the agent idle.

### 2. The Solution
An **Agent Steering Dock** integrated directly inside the negotiation playback room. 

```
+-------------------------------------------------------------+
|                     STEERING COMMAND DOCK                   |
|  [ Current Instruction: "Be stubborn about 3 remote days" ]|
|                                                             |
|  Quick Tactical Adjustments:                                |
|  [ +$5k Budget ]  [ Demand Equity ]  [ Force Remote ]      |
|                                                             |
|  Custom Tactical Guidance:                                  |
|  [ "Accept the current salary but demand more equity..." ]  |
|  (Send to Agent)                                            |
+-------------------------------------------------------------+
```

### 3. Implementation Blueprint

#### A. Database Schema Update (No-Migration String Fallback vs. Relational Config)
* **Immediate (No-Migration)**: Append to the pipe-delimited recruiter `remote_policy` or candidate `availability` field:
  `|steering_instruction:Accept the current salary but demand more equity`
* **Production-Scale**: Add a JSONB column `steering_parameters` to the `negotiations` table:
  ```sql
  ALTER TABLE negotiations ADD COLUMN steering_parameters JSONB DEFAULT '{}'::jsonb;
  ```

#### B. Backend Engine Updates (`negotiations.py`)
Modify the LangGraph state initialization to fetch these steering parameters and inject them dynamically as high-priority constraints inside the system prompt:
```python
# negotiations.py
def get_recruiter_agent_prompt(recruiter_profile, steering_params):
    base_prompt = f"You are a recruiter agent..."
    if steering_params.get("steering_instruction"):
        base_prompt += f"\n\nCRITICAL STEERING INSTRUCTION: {steering_params['steering_instruction']}"
    return base_prompt
```

#### C. Frontend UI Layout
Create a slider or collapsible dashboard drawer panel inside the `<PlaybackDrawer>` that permits real-time input fields and triggers a `PATCH` request to:
`/api/negotiations/{negotiation_id}/steer` with `{ "steering_instruction": "custom text..." }`

---

## 🛠️ Resolving Core Architectural & Security Critiques

### 1. The Serialization Anti-Pattern (A Serious Database Hack)
* **The Critique**: Storing highly structured settings (like `max_salary_flex` as an integer and `dealbreaker_salary` as a boolean) inside a text column named `remote_policy` using pipe delimiters (`|key:value`) is extremely fragile. User input containing pipes or colons will corrupt parsing.
* **Step-by-Step Resolution Blueprint**:
  1. **Create Target Configuration Tables**:
     ```sql
     CREATE TABLE recruiter_configs (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         recruiter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
         max_salary_flex INT DEFAULT 0,
         dealbreaker_salary BOOLEAN DEFAULT FALSE,
         negotiation_style VARCHAR(50) DEFAULT 'stubborn',
         remote_policy VARCHAR(255) DEFAULT 'hybrid',
         created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
     );

     CREATE TABLE candidate_configs (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         candidate_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
         min_salary_expectation INT DEFAULT 0,
         dealbreaker_salary BOOLEAN DEFAULT FALSE,
         negotiation_style VARCHAR(50) DEFAULT 'cooperative',
         availability VARCHAR(255) DEFAULT 'immediate',
         created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
     );
     ```
  2. **Data Migration Script**: Write a Python migration script to fetch all existing profiles, parse their `remote_policy` / `availability` pipe values, and write them into the new config tables.
  3. **Backend Refactoring**: Update `negotiations.py` to perform a clean relational JOIN:
     ```python
     # Fetch parsed parameters cleanly
     recruiter_cfg = db.table("recruiter_configs").select("*").eq("recruiter_id", rec_id).single().execute()
     ```
  4. **Frontend Form Modification**: Refactor settings API payloads to update the config tables directly rather than formatting raw string fields.

---

### 2. "Smoke and Mirrors" in the Frontend (Simulated WebSockets)
* **The Critique**: The Kanban board's Zoro negotiation slide-shifting is driven by client-side frontend `setTimeout` timers instead of authentic backend real-time WebSockets.
* **Step-by-Step Resolution Blueprint**:
  1. **FastAPI WebSocket Endpoint**:
     Establish a true WebSocket router in the backend:
     ```python
     from fastapi import APIRouter, WebSocket, WebSocketDisconnect

     router = APIRouter()
     active_connections = {}

     @router.websocket("/ws/negotiations/{negotiation_id}")
     async def negotiation_websocket(websocket: WebSocket, negotiation_id: str):
         await websocket.accept()
         active_connections[negotiation_id] = websocket
         try:
             while True:
                 await websocket.receive_text()  # Keep-alive
         except WebSocketDisconnect:
             active_connections.pop(negotiation_id, None)
     ```
  2. **Broadcast Agent Step Transitions**:
     Whenever the background matching loop or agent turn-taking executes a step or status transition in `negotiations.py`, send a broadcast event:
     ```python
     async def broadcast_event(negotiation_id: str, event_type: str, data: dict):
         if negotiation_id in active_connections:
             await active_connections[negotiation_id].send_json({
                 "type": event_type,
                 "payload": data
             })
     ```
  3. **Frontend React WebSocket Hooks**:
     Replace the hardcoded `setTimeout` clocks with a reactive WebSocket hook inside `<KanbanBoard>` or `<CandidateCard>`:
     ```typescript
     useEffect(() => {
         const ws = new WebSocket(`ws://localhost:8000/ws/negotiations/${negotiationId}`);
         ws.onmessage = (event) => {
             const message = JSON.parse(event.data);
             if (message.type === "STATUS_TRANSITION") {
                 updateCardPosition(message.payload.status);
             }
         };
         return () => ws.close();
     }, [negotiationId]);
     ```

---

### 3. Component Bloat (candidates/page.tsx is a 1,400+ Line Monolith)
* **The Critique**: The Kanban board, sliding drawer, search panel, hardcoded mock profiles (Luffy, Sanji, Zoro, Nami), drag-and-drop state, and takeover inputs are crammed into a single monolithic file.
* **Step-by-Step Resolution Blueprint**:
  1. **Establish Component Directory Structure**:
     ```
     frontend/src/components/dashboard/recruiter/
     ├── KanbanBoard.tsx          // Orchestrates state and drag-and-drop columns
     ├── KanbanColumn.tsx         // Renders individual columns (Matching, Active, Agreed)
     ├── CandidateCard.tsx        // Renders candidate details, progress dots, and trigger actions
     ├── PlaybackDrawer.tsx       // Handles glassmorphic side-sheet slide drawer
     └── TakeoverPanel.tsx        // Handles manual input box and agent pause toggles
     ```
  2. **State Management Extraction (Context / Zustand)**:
     Create `CandidatesContext.tsx` to host the massive state machine (e.g., active candidate ID, drawer open state, search query, loading matching processes) to prevent deep prop-drilling.
  3. **Decouple Mocks**:
     Move mock dialogues, fallback profile matrices, and static mock text lists out of the render files and place them in a dedicated static data folder: `frontend/src/data/mockCandidates.ts`.

---

### 4. Fragile String-Parsing in the LLM Engine (No Guaranteed Outputs)
* **The Critique**: The matching loop relies on parsing free-text outputs for literal strings like `[AGREED]` or `[IMPASSE]`. This breaks if the model gets creative or omits tags.
* **Step-by-Step Resolution Blueprint**:
  1. **Define Pydantic Engine Schema**:
     ```python
     from pydantic import BaseModel, Field
     from typing import Literal

     class AgentResponseSchema(BaseModel):
         message: str = Field(
             description="The exact textual reply to the opposing agent or system."
         )
         action: Literal["negotiating", "agreed", "impasse"] = Field(
             description="The structural state transition proposed by this turn."
         )
         compromise_score: float = Field(
             description="The internal calculated satisfaction score (0.0 to 1.0) of current terms."
         )
     ```
  2. **Enforce Structured Outputs in LLM Turns**:
     Update the OpenAI API invocation within `negotiations.py` to use `with_structured_output`:
     ```python
     structured_llm = llm.with_structured_output(AgentResponseSchema)
     response = structured_llm.invoke(prompt)
     # Access cleanly without regex or string splits:
     proposed_action = response.action
     message_content = response.message
     ```
  3. **Strict Validation Fail-Safes**:
     If structured response fails, fall back to parsing but flag a schema alert in the telemetry dashboard.

---

### 5. Severe Security Vulnerability (No Tenant Isolation)
* **The Critique**: The FastAPI backend routes (like `/api/negotiations/{negotiation_id}/status`) accept status modifications, pauses, and resumes without verifying tenant ownership. Anyone can manipulate competitor state with curl requests.
* **Step-by-Step Resolution Blueprint**:
  1. **Implement Supabase JWT Middleware in FastAPI**:
     Create an authorization helper to extract and verify the bearer token using the Supabase JWT secret:
     ```python
     import jwt
     from fastapi import Depends, HTTPException, Security
     from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

     security = HTTPBearer()

     def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
         token = credentials.credentials
         try:
             payload = jwt.decode(token, "YOUR_SUPABASE_JWT_SECRET", algorithms=["HS256"])
             return payload  # Contains user_id in 'sub'
         except jwt.PyJWTError:
             raise HTTPException(status_code=401, detail="Invalid token")
     ```
  2. **Enforce Ownership Boundaries**:
     When modifying a negotiation record, strictly confirm that the authenticated `user_id` belongs to the recruiter or candidate attached to the target negotiation:
     ```python
     @router.patch("/api/negotiations/{negotiation_id}/status")
     async def update_negotiation_status(
         negotiation_id: str,
         status_payload: StatusUpdate,
         current_user: dict = Depends(get_current_user)
     ):
         # Fetch negotiation to verify ownership
         neg = db.table("negotiations").select("*").eq("id", negotiation_id).single().execute()
         if not neg.data:
             raise HTTPException(status_code=404, detail="Negotiation not found")
         
         user_id = current_user["sub"]
         # Fetch profile representing the current user
         profile = db.table("profiles").select("id").eq("id", user_id).single().execute()
         
         # Assert that user's profile ID matches either recruiter_id or candidate_id
         if profile.data["id"] not in [neg.data["recruiter_id"], neg.data["candidate_id"]]:
             raise HTTPException(status_code=403, detail="Unauthorized to steer this negotiation")
         
         # Proceed with safe execution...
     ```
