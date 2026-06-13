from __future__ import annotations

from a2a.server.request_handlers import DefaultRequestHandlerV2
from a2a.server.routes import create_agent_card_routes, create_jsonrpc_routes
from a2a.server.tasks import InMemoryTaskStore
from a2a.types import AgentCapabilities, AgentCard
from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from agents.candidate.executor import CandidateAgentExecutor
from agents.recruiter.executor import RecruiterAgentExecutor
from api.calendar import router as calendar_router
from api.candidates import router as candidates_router
from api.intake import router as intake_router
from api.jobs import router as jobs_router
from api.matching import router as matching_router
from api.negotiations import router as negotiations_router
from api.recruiters import router as recruiters_router
from api.ws import router as ws_router

app = FastAPI(title="recruitx Backend", version="0.1.0")

import os

allowed_origins = [
    origin.strip()
    for origin in os.environ.get(
        "CORS_ALLOW_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://192.168.137.1:3000",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

task_store = InMemoryTaskStore()

candidate_executor = CandidateAgentExecutor()
candidate_card = AgentCard()
candidate_card.name = "recruitx Candidate Agent"
candidate_card.description = (
    "Represents candidates in the recruitx A2A hiring marketplace"
)
candidate_card.version = "0.1.0"
candidate_card.capabilities.CopyFrom(AgentCapabilities())
candidate_handler = DefaultRequestHandlerV2(
    agent_executor=candidate_executor,
    task_store=task_store,
    agent_card=candidate_card,
)

recruiter_executor = RecruiterAgentExecutor()
recruiter_card = AgentCard()
recruiter_card.name = "recruitx Recruiter Agent"
recruiter_card.description = (
    "Represents recruiters in the recruitx A2A hiring marketplace"
)
recruiter_card.version = "0.1.0"
recruiter_card.capabilities.CopyFrom(AgentCapabilities())
recruiter_handler = DefaultRequestHandlerV2(
    agent_executor=recruiter_executor,
    task_store=task_store,
    agent_card=recruiter_card,
)

a2a_router = APIRouter()
for r in create_jsonrpc_routes(
    request_handler=candidate_handler, rpc_url="/a2a/candidate/jsonrpc"
):
    a2a_router.add_route(r.path, r.endpoint, methods=list(r.methods), name=r.name)
for r in create_agent_card_routes(agent_card=candidate_card, card_url="/a2a/candidate"):
    a2a_router.add_route(r.path, r.endpoint, methods=list(r.methods), name=r.name)
for r in create_jsonrpc_routes(
    request_handler=recruiter_handler, rpc_url="/a2a/recruiter/jsonrpc"
):
    a2a_router.add_route(r.path, r.endpoint, methods=list(r.methods), name=r.name)
for r in create_agent_card_routes(agent_card=recruiter_card, card_url="/a2a/recruiter"):
    a2a_router.add_route(r.path, r.endpoint, methods=list(r.methods), name=r.name)

app.include_router(a2a_router)
app.include_router(jobs_router)
app.include_router(ws_router)
app.include_router(negotiations_router)
app.include_router(matching_router)
app.include_router(candidates_router)
app.include_router(recruiters_router)
app.include_router(intake_router)
app.include_router(calendar_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
