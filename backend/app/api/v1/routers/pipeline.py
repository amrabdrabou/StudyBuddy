"""Pipeline status router — inspect pipeline runs for a workspace."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_workspace
from app.core.db_setup import get_db
from app.models.pipeline_run import PipelineRun
from app.models.workspace import Workspace

router = APIRouter(prefix="/workspaces/{workspace_id}/pipeline", tags=["pipeline"])


@router.get("/status")
async def get_pipeline_status(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Workspace = Depends(get_workspace),
):
    """Return all pipeline runs for the workspace, ordered by created_at desc."""
    result = await db.execute(
        select(PipelineRun)
        .where(PipelineRun.workspace_id == workspace_id)
        .order_by(PipelineRun.created_at.desc())
    )
    runs = result.scalars().all()
    return [
        {
            "id": str(r.id),
            "task_name": r.task_name,
            "status": r.status,
            "document_id": str(r.document_id) if r.document_id else None,
            "triggered_by": r.triggered_by,
            "error_message": r.error_message,
            "started_at": r.started_at.isoformat() if r.started_at else None,
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
            "created_at": r.created_at.isoformat(),
        }
        for r in runs
    ]
