from __future__ import annotations

import json

from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.types import Message, Part, Role, TaskState, TaskStatusUpdateEvent

from .graph import CandidateState, build_candidate_graph


class CandidateAgentExecutor(AgentExecutor):
    def __init__(self) -> None:
        self._graph = build_candidate_graph()

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

        state: CandidateState = {
            "user_id": thread_id,
            "profile": {"raw_input": user_input},
            "verified_skills": {},
            "preferences": {},
            "dealbreakers": [],
            "salary_floor": None,
            "salary_target": None,
            "fit_score": 0.0,
            "active_negotiations": [],
            "matches": [],
            "scheduled_meetings": [],
            "escalations": [],
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
