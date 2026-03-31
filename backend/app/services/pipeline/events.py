"""Pipeline event emitters — enqueue background tasks via RQ.

Falls back to a no-op if Redis is unavailable (dev without Redis).
"""
from __future__ import annotations

import logging
import uuid

logger = logging.getLogger(__name__)

# RQ queue names
QUEUE_DEFAULT = "default"


def _get_queue(name: str = QUEUE_DEFAULT):
    """Return an RQ Queue, or None if Redis/RQ is unavailable."""
    try:
        from rq import Queue
        from app.core.redis_client import get_redis
        r = get_redis()
        if r is None:
            return None
        return Queue(name, connection=r)
    except Exception as exc:
        logger.warning("RQ unavailable — pipeline event skipped: %s", exc)
        return None


def emit_workspace_created(workspace_id: uuid.UUID) -> None:
    """Enqueue initial workspace pipeline (micro-goals + progress)."""
    q = _get_queue()
    if q is None:
        logger.warning("pipeline: Redis offline — workspace.created skipped for %s (micro-goals will not be generated)", workspace_id)
        return
    try:
        from app.services.pipeline.tasks import run_workspace_pipeline
        q.enqueue(run_workspace_pipeline, str(workspace_id))
        logger.info("pipeline: enqueued workspace.created for %s", workspace_id)
    except Exception as exc:
        logger.warning("pipeline: failed to enqueue workspace.created: %s", exc)


def emit_document_ready(workspace_id: uuid.UUID, document_id: uuid.UUID) -> None:
    """Enqueue document pipeline (summarize → flashcards → quiz → micro-goals → progress)."""
    q = _get_queue()
    if q is None:
        logger.warning("pipeline: Redis offline — document.ready skipped for doc %s (AI generation will not run)", document_id)
        return
    try:
        from app.services.pipeline.tasks import run_document_pipeline
        q.enqueue(run_document_pipeline, str(workspace_id), str(document_id))
        logger.info("pipeline: enqueued document.ready for workspace=%s doc=%s", workspace_id, document_id)
    except Exception as exc:
        logger.warning("pipeline: failed to enqueue document.ready: %s", exc)
