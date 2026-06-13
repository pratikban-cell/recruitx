from __future__ import annotations
import json
import os
from typing import Annotated, Literal, TypedDict
import operator
from openai import OpenAI
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import InMemorySaver

from agents.negotiation.protocol import FitScoreInput, calculate_fit_score


_openai: OpenAI | None = None


def _get_llm() -> OpenAI:
    global _openai
    if _openai is None:
        _openai = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    return _openai


_ANALYZE_SYSTEM_PROMPT = """You are a recruiter agent analyzing a job requirement.
Extract structured details from raw input.
Return JSON with: title (str), description (str), required_skills (list[str]),
must_haves (list[str]), salary_ceiling (int or null), salary_budget (int or null),
dealbreakers (list[str])."""


class RecruiterState(TypedDict):
    user_id: str
    role_profile: dict
    company_profile: dict
    candidate_pipeline: Annotated[list[dict], operator.add]
    active_negotiations: Annotated[list[dict], operator.add]
    shortlist: Annotated[list[dict], operator.add]
    scheduled_interviews: Annotated[list[dict], operator.add]
    fit_score: float
    messages: Annotated[list[dict], operator.add]
    current_task: str | None
    candidate_profile: dict


def analyze_role(state: RecruiterState) -> dict:
    raw = state.get("role_profile", {}).get("raw_input", "")
    if not raw:
        return {}

    resp = _get_llm().chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": _ANALYZE_SYSTEM_PROMPT},
            {"role": "user", "content": raw},
        ],
        response_format={"type": "json_object"},
    )
    parsed = json.loads(resp.choices[0].message.content or "{}")
    return {
        "role_profile": {**state.get("role_profile", {}), **parsed},
    }


def screen_candidates(state: RecruiterState) -> dict:
    rp = state.get("role_profile", {})
    pipeline = state.get("candidate_pipeline", [])
    scored = []
    for c in pipeline:
        score = calculate_fit_score(
            FitScoreInput(
                candidate_verified_skills=c.get("verified_skills", {}),
                candidate_salary_min=c.get("salary_floor"),
                candidate_salary_target=c.get("salary_target"),
                candidate_dealbreakers=c.get("dealbreakers", []),
                candidate_priorities=c.get("preferences", {}).get("priorities", []),
                recruiter_requirements=rp.get("required_skills", {}),
                recruiter_salary_ceiling=rp.get("salary_ceiling"),
                recruiter_salary_budget=rp.get("salary_budget"),
                recruiter_must_haves=rp.get("must_haves", []),
                recruiter_dealbreakers=rp.get("dealbreakers", []),
            )
        )
        scored.append({**c, "fit_score": score})
    best = max((c["fit_score"] for c in scored), default=0.0)
    return {
        "candidate_pipeline": scored,
        "fit_score": best,
    }


from pydantic import BaseModel, Field


class AgentTurnSchema(BaseModel):
    message: str = Field(description="The direct professional text message to the candidate agent.")
    signal: Literal["AGREED", "IMPASSE", "CONTINUE"] = Field(
        description="The negotiation status signal: 'AGREED' if terms are fully aligned, 'IMPASSE' if there is an irreconcilable dealbreaker, 'CONTINUE' otherwise."
    )


def negotiate(state: RecruiterState) -> dict:
    last_msg = (state.get("messages") or [None])[-1]
    if not last_msg:
        return {}

    fit_score = state.get("fit_score", 0.0)
    
    role_profile = state.get("role_profile") or {}
    style = role_profile.get("recruiter_negotiation_style") or "collaborative"
    max_flex = role_profile.get("max_salary_flex")
    salary_ceiling = role_profile.get("salary_range_max")
    steering_instruction = role_profile.get("steering_instruction")

    # Construct candidate dossier
    cand_profile = state.get("candidate_profile") or {}
    cand_name = cand_profile.get("name") or "the candidate"
    cand_title = cand_profile.get("title") or "Candidate"
    cand_skills = ", ".join(cand_profile.get("skills") or [])
    cand_github = cand_profile.get("github_url")
    cand_portfolio = cand_profile.get("portfolio_url")
    cand_bio = cand_profile.get("bio")
    
    cand_dossier = f"\n=== CANDIDATE DOSSIER ===\n"
    cand_dossier += f"- Name: {cand_name}\n"
    cand_dossier += f"- Target Title: {cand_title}\n"
    if cand_skills:
        cand_dossier += f"- Key Skills: {cand_skills}\n"
    if cand_bio:
        cand_dossier += f"- Resume/Bio: {cand_bio}\n"
    if cand_github:
        cand_dossier += f"- GitHub Profile: {cand_github}\n"
    if cand_portfolio:
        cand_dossier += f"- Portfolio: {cand_portfolio}\n"
    cand_dossier += f"==========================\n"

    system = f"You are a recruiter agent representing a hiring manager in a salary negotiation. Your negotiation style preference is: '{style}'.\n"
    system += cand_dossier
    system += "IMPORTANT: You must review the candidate's dossier above carefully. During the screening and negotiation dialogue, you are required to explicitly reference and naturally discuss the candidate's credentials (such as their professional bio/resume highlights, key skills, and their GitHub or personal portfolio URLs if provided) to show that you have thoroughly screened their actual work, repositories, or portfolio projects, and use these details to justify your hiring interest, offer terms, or alignment with job requirements.\n\n"
    if style == "firm":
        system += "Negotiate firmly. Hold ground on the specified budget. Do not compromise easily. Defend your standard budget ceiling.\n"
    elif style == "flexible":
        system += "Be cooperative and flexible. Prioritize closing the deal and moving to an interview schedule quickly, even if you need to offer slightly higher salary terms. But still, carry out a natural, polite conversation.\n"
    elif style == "stubborn":
        system += "Negotiate stubbornly. Stick rigidly to the standard salary maximum. Do NOT offer any salary flex under any circumstances, even if maximum flex is defined below. Propose a final offer at your standard ceiling and warn the candidate to accept it or hit an impasse.\n"
    elif style == "competitive":
        system += "Negotiate competitively. Focus heavily on minimizing cost, pushing back hard on salary demands, extracting high skills value, and yielding only tiny, slow concessions.\n"
    else:
        system += "Be collaborative. Seek mutually beneficial terms (win-win solutions) but maintain professional bounds. Propose constructive compromises.\n"

    if salary_ceiling:
        system += f"Your target standard salary maximum is ${salary_ceiling:,}.\n"
    if max_flex:
        system += f"IMPORTANT: If the candidate demands a higher salary and has outstanding verified skills, you have absolute authority to flex up to a maximum of ${max_flex:,} to close the deal, but do not exceed this limit.\n"

    if steering_instruction:
        system += f"\n🚨 IMPORTANT REAL-TIME TACTICAL CO-PILOT INSTRUCTION FROM YOUR REPRESENTED HUMAN RECRUITER:\n" \
                  f"\"{steering_instruction}\"\n" \
                  f"You MUST strictly follow and incorporate this tactical instruction in your negotiation strategy immediately.\n\n"

    system += "\nDYNAMIC TERMINATION RULES:\n" \
              "1. Once you and the candidate have mutually aligned on salary, remote options, and standard terms, you must set the 'signal' field to 'AGREED'.\n" \
              "2. If you realize there is a critical, irreconcilable dealbreaker or budget mismatch (e.g. their minimum salary exceeds your maximum flex ceiling), you must set the 'signal' field to 'IMPASSE'.\n" \
              "3. Otherwise, set the 'signal' field to 'CONTINUE'.\n"

    system += "Respond directly and professionally to the candidate's agent message. Carry on a normal, realistic, back-and-forth professional chat. Address their questions, ask your own, and discuss alignment on skills, salary, remote options, or standard benefits (like health, hardware, etc.). Do not rush to a final conclusion in the first message—allow the conversation to unfold naturally over multiple turns. Keep your messages concise, realistic, and highly conversational.\n"

    # Construct the full conversation history for OpenAI
    llm_messages = [{"role": "system", "content": system}]
    history = state.get("messages") or []
    for msg in history:
        role = msg.get("role")
        content = msg.get("content")
        if role == "recruiter_agent":
            llm_messages.append({"role": "assistant", "content": content})
        elif role == "candidate_agent":
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
        "messages": [{"role": "recruiter_agent", "content": reply, "fit_score": fit_score}],
    }


def schedule(state: RecruiterState) -> dict:
    return {
        "scheduled_interviews": state.get("scheduled_interviews", []),
        "current_task": "scheduled",
    }


def route_after_negotiation(
    state: RecruiterState,
) -> Literal["schedule", END]:
    if state.get("current_task") == "fit_confirmed":
        return "schedule"
    return END


def build_recruiter_graph() -> StateGraph:
    checkpointer = InMemorySaver()

    graph = StateGraph(state_schema=RecruiterState)

    graph.add_node("analyze_role", analyze_role)
    graph.add_node("screen", screen_candidates)
    graph.add_node("negotiate", negotiate)
    graph.add_node("schedule", schedule)

    graph.add_edge(START, "analyze_role")
    graph.add_edge("analyze_role", "screen")
    graph.add_edge("screen", "negotiate")
    graph.add_conditional_edges(
        "negotiate",
        route_after_negotiation,
        ["schedule", END],
    )
    graph.add_edge("schedule", END)

    compiled = graph.compile(checkpointer=checkpointer)
    return compiled
