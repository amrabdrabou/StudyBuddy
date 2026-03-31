"""AI Jobs router — read-only status view of past AI jobs.

NOTE: Creating jobs via this API does nothing — the real AI pipeline is driven
by document upload events (RQ tasks via pipeline/tasks.py) and the manual
generation endpoints in ai_generate.py. The POST endpoint has been removed to
avoid creating orphan records that never transition out of 'queued'.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_workspace
from app.core.db_setup import get_db
from app.models.ai_job import AIJob
from app.models.workspace import Workspace
from app.schemas.ai_job import AIJobResponse
from app.api.v1.dependencies import get_current_active_user

router = APIRouter(prefix="/workspaces/{workspace_id}/ai-jobs", tags=["ai"])


@router.get("/", response_model=list[AIJobResponse])
async def list_ai_jobs(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Workspace = Depends(get_workspace),
):
    result = await db.execute(
        select(AIJob)
        .where(AIJob.workspace_id == workspace_id)
        .order_by(AIJob.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{job_id}", response_model=AIJobResponse)
async def get_ai_job(
    workspace_id: uuid.UUID,
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Workspace = Depends(get_workspace),
):
    result = await db.execute(
        select(AIJob).where(AIJob.id == job_id, AIJob.workspace_id == workspace_id)
    )
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI job not found")
    return job


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_ai_job(
    workspace_id: uuid.UUID,
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Workspace = Depends(get_workspace),
):
    result = await db.execute(
        select(AIJob).where(AIJob.id == job_id, AIJob.workspace_id == workspace_id)
    )
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI job not found")
    if job.status in {"completed", "canceled"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot cancel a job with status '{job.status}'",
        )
    job.status = "canceled"
    await db.commit()
