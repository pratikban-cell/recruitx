import os
import asyncio
from celery import Celery

REDIS_URL = os.environ.get("REDIS_URL") or "redis://localhost:6379/0"
USE_CELERY = os.environ.get("USE_CELERY", "false").lower() == "true"

celery_app = Celery(
    "nirvan_tasks",
    broker=REDIS_URL,
    backend=REDIS_URL
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # Windows compatibility tweak
    worker_pool="solo"
)

# Helper to run async tasks inside Celery sync runner
def run_async(coro):
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)

@celery_app.task(name="tasks.run_matching_scan")
def celery_run_matching_scan(candidate_id=None, recruiter_id=None, job_id=None):
    from api.matching import run_matching_scan
    return run_async(run_matching_scan(candidate_id=candidate_id, recruiter_id=recruiter_id, job_id=job_id))

@celery_app.task(name="tasks.run_negotiation_loop")
def celery_run_negotiation_loop(negotiation_id: str):
    from api.negotiations import run_negotiation_loop
    return run_async(run_negotiation_loop(negotiation_id))

@celery_app.task(name="tasks.notify_takeover_paused")
def celery_notify_takeover_paused(negotiation_id: str, paused_by_role: str):
    from api.notifications import notify_takeover_paused
    return run_async(notify_takeover_paused(negotiation_id, paused_by_role))

@celery_app.task(name="tasks.notify_meeting_booked")
def celery_notify_meeting_booked(negotiation_id: str, meeting_time: str, meet_link: str):
    from api.notifications import notify_meeting_booked
    return run_async(notify_meeting_booked(negotiation_id, meeting_time, meet_link))

@celery_app.task(name="tasks.notify_new_match")
def celery_notify_new_match(negotiation_id: str):
    from api.notifications import notify_new_match
    return run_async(notify_new_match(negotiation_id))


@celery_app.task(name="tasks.enrich_profile")
def celery_enrich_profile(candidate_id: str):
    from services.crawler import enrich_profile
    return run_async(enrich_profile(candidate_id))


# Dynamic dispatcher
def dispatch_task(background_tasks, task_name: str, *args, **kwargs):
    """
    Enqueues the task via Celery if USE_CELERY is True.
    Otherwise, falls back to FastAPI BackgroundTasks for local execution.
    """
    if USE_CELERY:
        try:
            if task_name == "run_matching_scan":
                celery_run_matching_scan.delay(*args, **kwargs)
            elif task_name == "run_negotiation_loop":
                celery_run_negotiation_loop.delay(*args, **kwargs)
            elif task_name == "notify_takeover_paused":
                celery_notify_takeover_paused.delay(*args, **kwargs)
            elif task_name == "notify_meeting_booked":
                celery_notify_meeting_booked.delay(*args, **kwargs)
            elif task_name == "notify_new_match":
                celery_notify_new_match.delay(*args, **kwargs)
            elif task_name == "enrich_profile":
                celery_enrich_profile.delay(*args, **kwargs)
            else:
                print(f"Celery task '{task_name}' not recognized. Falling back to local BackgroundTasks.")
                _local_fallback(background_tasks, task_name, *args, **kwargs)
            return
        except Exception as e:
            print(f"Failed to dispatch to Celery ({str(e)}). Falling back to local BackgroundTasks.")
    
    _local_fallback(background_tasks, task_name, *args, **kwargs)

def _local_fallback(background_tasks, task_name: str, *args, **kwargs):
    if task_name == "run_matching_scan":
        from api.matching import run_matching_scan
        if background_tasks:
            background_tasks.add_task(run_matching_scan, *args, **kwargs)
        else:
            asyncio.create_task(run_matching_scan(*args, **kwargs))
    elif task_name == "run_negotiation_loop":
        from api.negotiations import run_negotiation_loop
        if background_tasks:
            background_tasks.add_task(run_negotiation_loop, *args, **kwargs)
        else:
            asyncio.create_task(run_negotiation_loop(*args, **kwargs))
    elif task_name == "notify_takeover_paused":
        from api.notifications import notify_takeover_paused
        if background_tasks:
            background_tasks.add_task(notify_takeover_paused, *args, **kwargs)
        else:
            asyncio.create_task(notify_takeover_paused(*args, **kwargs))
    elif task_name == "notify_meeting_booked":
        from api.notifications import notify_meeting_booked
        if background_tasks:
            background_tasks.add_task(notify_meeting_booked, *args, **kwargs)
        else:
            asyncio.create_task(notify_meeting_booked(*args, **kwargs))
    elif task_name == "notify_new_match":
        from api.notifications import notify_new_match
        if background_tasks:
            background_tasks.add_task(notify_new_match, *args, **kwargs)
        else:
            asyncio.create_task(notify_new_match(*args, **kwargs))
    elif task_name == "enrich_profile":
        from services.crawler import enrich_profile
        if background_tasks:
            background_tasks.add_task(enrich_profile, *args, **kwargs)
        else:
            asyncio.create_task(enrich_profile(*args, **kwargs))
