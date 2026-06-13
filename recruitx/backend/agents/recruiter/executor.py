from __future__ import annotations

import json

from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.types import Message, Part, Role, TaskState, TaskStatusUpdateEvent
from db.client import get_db

from .graph import RecruiterState, build_recruiter_graph


class RecruiterAgentExecutor(AgentExecutor):
    def __init__(self) -> None:
        self._graph = build_recruiter_graph()

    async def cancel(
        self, context: RequestContext, event_queue: EventQueue
    ) -> None:
        status_evt = TaskStatusUpdateEvent()
        status_evt.status.state = TaskState.TASK_STATE_CANCELED
        await event_queue.enqueue_event(status_evt)

    async def execute(
        self, context: RequestContext, event_queue: EventQueue
    ) -> None:
        user_input = context.get_user_input()
        thread_id = context.task_id or context.context_id or "default"

        try:
            db = get_db()
            result = db.table("candidates").select(
                "profile_id, title, skills, salary_min, remote_pref, availability, github_url"
            ).execute()
            pipeline = [
                {
                    "user_id": c.get("profile_id", ""),
                    "verified_skills": {s: "verified" for s in (c.get("skills") or [])},
                    "salary_floor": c.get("salary_min"),
                    "salary_target": None,
                    "dealbreakers": [],
                    "preferences": {
                        "remote": c.get("remote_pref", True),
                        "priorities": ["remote"] if c.get("remote_pref") else [],
                    },
                }
                for c in (result.data or [])
            ]
        except Exception:
            pipeline = []

        state: RecruiterState = {
            "user_id": thread_id,
            "role_profile": {"raw_input": user_input},
            "company_profile": {},
            "candidate_pipeline": pipeline,
            "active_negotiations": [],
            "shortlist": [],
            "scheduled_interviews": [],
            "fit_score": 0.0,
            "messages": [],
            "current_task": None,
        }

        config = {"configurable": {"thread_id": thread_id}}
        result = await self._graph.ainvoke(state, config)

        status_evt = TaskStatusUpdateEvent()
        status_evt.status.state = TaskState.TASK_STATE_COMPLETED
        await event_queue.enqueue_event(status_evt)

        msg = Message()
        msg.message_id = f"msg-{thread_id}"
        msg.task_id = thread_id
        msg.role = Role.ROLE_AGENT
        part = Part()
        part.text = json.dumps(result, default=str)
        msg.parts.append(part)
        await event_queue.enqueue_event(msg)
