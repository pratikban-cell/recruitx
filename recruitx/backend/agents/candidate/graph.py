from __future__ import annotations
import json
import os
from typing import Annotated, Literal, TypedDict
import operator
from openai import OpenAI
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import InMemorySaver


_openai: OpenAI | None = None


def _get_llm() -> OpenAI:
    global _openai
    if _openai is None:
        _openai = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    return _openai


_CANDIDATE_SYSTEM_PROMPT = """You are a candidate agent in a hiring marketplace.
Extract structured preferences from the candidate's raw input.
Return JSON with:
- title (str, e.g., Senior Software Engineer)
- skills (list of str, e.g., ["Python", "AWS", "FastAPI"])
- preferences (dict)
- dealbreakers (list[str])
- salary_floor (int or null)
- salary_target (int or null)"""


class CandidateState(TypedDict):
    user_id: str
    profile: dict
    title: str | None
    skills: list[str] | None
    verified_skills: dict
    preferences: dict
    dealbreakers: list[str]
    salary_floor: int | None
    salary_target: int | None
    fit_score: float
    active_negotiations: Annotated[list[dict], operator.add]
    matches: Annotated[list[dict], operator.add]
    scheduled_meetings: Annotated[list[dict], operator.add]
    escalations: Annotated[list[dict], operator.add]
    messages: Annotated[list[dict], operator.add]
    current_task: str | None


def build_orphan_profile(state: CandidateState) -> dict:
    raw = state.get("profile", {}).get("raw_input", "")
    if not raw:
        return {}

    resp = _get_llm().chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": _CANDIDATE_SYSTEM_PROMPT},
            {"role": "user", "content": raw},
        ],
        response_format={"type": "json_object"},
    )
    parsed = json.loads(resp.choices[0].message.content or "{}")
    return {
        "title": parsed.get("title") or "",
        "skills": parsed.get("skills") or [],
        "preferences": parsed.get("preferences", {}),
        "dealbreakers": parsed.get("dealbreakers", []),
        "salary_floor": parsed.get("salary_floor"),
        "salary_target": parsed.get("salary_target"),
    }


def run_verification(state: CandidateState) -> dict:
    return {
        "verified_skills": state.get("verified_skills", {}),
    }


from pydantic import BaseModel, Field

class AgentTurnSchema(BaseModel):
    message: str = Field(description="The direct professional text message to the recruiter agent.")
    signal: Literal["AGREED", "IMPASSE", "CONTINUE"] = Field(
        description="The negotiation status signal: 'AGREED' if terms are fully aligned, 'IMPASSE' if there is an irreconcilable dealbreaker, 'CONTINUE' otherwise."
    )


def negotiate(state: CandidateState) -> dict:
    last_msg = (state.get("messages") or [None])[-1]
    if not last_msg:
        return {}

    fit_score = state.get("fit_score", 0.0)
    if isinstance(last_msg, dict) and "fit_score" in last_msg:
        fit_score = last_msg["fit_score"]

    profile = state.get("profile") or {}
    style = profile.get("negotiation_style") or "collaborative"
    equity_threshold = profile.get("equity_demand_threshold")
    salary_floor = profile.get("salary_min")
    steering_instruction = profile.get("steering_instruction")

    # Build candidate dossier background
    dossier_items = []
    if profile.get("name"):
        dossier_items.append(f"Name: {profile['name']}")
    if profile.get("title"):
        dossier_items.append(f"Target Role/Title: {profile['title']}")
    if profile.get("skills"):
        skills_str = ", ".join(profile["skills"]) if isinstance(profile["skills"], list) else str(profile["skills"])
        dossier_items.append(f"Skills: {skills_str}")
    if profile.get("bio"):
        dossier_items.append(f"Professional Summary/Bio: {profile['bio']}")
    if profile.get("github_url"):
        dossier_items.append(f"GitHub: {profile['github_url']}")
    if profile.get("portfolio_url"):
        dossier_items.append(f"Portfolio: {profile['portfolio_url']}")

    dossier_prompt = ""
    if dossier_items:
        dossier_prompt = "=== YOUR PROFESSIONAL DOSSIER ===\n" + "\n".join(f"- {item}" for item in dossier_items) + "\n=================================\n"
        dossier_prompt += "Ensure you naturally and professionally reference your skills, experience summary (bio), and portfolio/GitHub links when negotiating or representing yourself to justify your salary expectations and prove your fit.\n\n"

    system = f"You are a candidate agent representing a job seeker in a salary negotiation. Your negotiation style preference is: '{style}'.\n"
    system += dossier_prompt
    if style == "firm":
        system += "Negotiate firmly. Hold ground on your minimum salary expectations and other parameters. Do not compromise easily. Present counter-offers when appropriate.\n"
    elif style == "flexible":
        system += "Be cooperative and flexible. Prioritize closing the deal and moving to an interview schedule, even if you have to compromise slightly on your ideal numbers. But still, carry out a natural, polite conversation.\n"
    else:
        system += "Be collaborative. Seek mutually beneficial terms (win-win solutions) but maintain a professional boundary. Propose constructive ideas.\n"

    if salary_floor:
        system += f"Your absolute minimum required base salary is ${salary_floor:,}. Never agree to any base salary lower than this.\n"
        
    if equity_threshold:
        system += f"IMPORTANT: If the recruiter proposes or suggests a base salary under ${equity_threshold:,}, you MUST demand company equity (stock options/shares) to compensate for the lower cash compensation.\n"

    if steering_instruction:
        system += f"\n🚨 IMPORTANT REAL-TIME TACTICAL CO-PILOT INSTRUCTION FROM YOUR REPRESENTED HUMAN:\n" \
                  f"\"{steering_instruction}\"\n" \
                  f"You MUST strictly follow and incorporate this tactical instruction in your negotiation strategy immediately.\n\n"

    system += "\nDYNAMIC TERMINATION RULES:\n" \
              "1. Once you and the recruiter have mutually aligned on salary, remote options, and standard terms, you must set the 'signal' field to 'AGREED'.\n" \
              "2. If you realize there is a critical, irreconcilable dealbreaker or mismatch (e.g. they offer a salary below your minimum ceiling/floor and offer no equity), you must set the 'signal' field to 'IMPASSE'.\n" \
              "3. Otherwise, set the 'signal' field to 'CONTINUE'.\n"

    system += "Respond directly and professionally to the recruiter's message. Carry on a normal, realistic, back-and-forth professional chat. Address their questions, ask your own, and discuss alignment on skills, salary, remote options, or standard benefits (like health, hardware, etc.). Do not rush to a final conclusion in the first message—allow the conversation to unfold naturally over multiple turns. Keep your messages concise, realistic, and highly conversational.\n"

    # Construct the full conversation history for OpenAI
    llm_messages = [{"role": "system", "content": system}]
    history = state.get("messages") or []
    for msg in history:
        role = msg.get("role")
        content = msg.get("content")
        if role == "candidate_agent":
            llm_messages.append({"role": "assistant", "content": content})
        elif role == "recruiter_agent":
            llm_messages.append({"role": "user", "content": content})
        elif role == "system":
            # Treat system events as general user context for the model
            llm_messages.append({"role": "user", "content": f"[System Event] {content}"})

    resp = _get_llm().beta.chat.completions.parse(
        model="gpt-4o-mini",
        messages=llm_messages,
        response_format=AgentTurnSchema,
    )
    parsed = resp.choices[0].message.parsed
    message = parsed.message if parsed else ""
    signal = parsed.signal if parsed else "CONTINUE"
    
    if signal == "AGREED":
        reply = f"{message} [AGREED]"
    elif signal == "IMPASSE":
        reply = f"{message} [IMPASSE]"
    else:
        reply = message

    return {
        "messages": [{"role": "candidate_agent", "content": reply}],
        "fit_score": fit_score,
    }


def schedule(state: CandidateState) -> dict:
    return {
        "scheduled_meetings": state.get("scheduled_meetings", []),
        "current_task": "scheduled",
    }


def escalate(state: CandidateState) -> dict:
    return {
        "escalations": state.get("escalations", []),
        "current_task": "escalated",
    }


def route_after_negotiation(
    state: CandidateState,
) -> Literal["schedule", "escalate", END]:
    if state.get("current_task") == "fit_confirmed":
        return "schedule"
    if state.get("current_task") == "needs_input":
        return "escalate"
    return END


def build_candidate_graph() -> StateGraph:
    checkpointer = InMemorySaver()

    graph = StateGraph(state_schema=CandidateState)

    graph.add_node("build_profile", build_orphan_profile)
    graph.add_node("verify", run_verification)
    graph.add_node("negotiate", negotiate)
    graph.add_node("schedule", schedule)
    graph.add_node("escalate", escalate)

    graph.add_edge(START, "build_profile")
    graph.add_edge("build_profile", "verify")
    graph.add_edge("verify", "negotiate")
    graph.add_conditional_edges(
        "negotiate",
        route_after_negotiation,
        ["schedule", "escalate", END],
    )
    graph.add_edge("schedule", END)
    graph.add_edge("escalate", END)

    compiled = graph.compile(checkpointer=checkpointer)
    return compiled
