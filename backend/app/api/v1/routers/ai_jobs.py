"""AI Jobs router — trigger and track structured AI generation jobs."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_workspace
from app.core.db_setup import get_db
from app.models.ai_job import AIJob
from app.models.document import Document
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.ai_job import AIJobCreate, AIJobResponse
from app.api.v1.dependencies import get_current_active_user

router = APIRouter(prefix="/workspaces/{workspace_id}/ai-jobs", tags=["ai"])


async def _validate_document(
    document_id: uuid.UUID, workspace_id: uuid.UUID, db: AsyncSession
) -> None:
    result = await db.execute(
        select(Document.id).where(
            Document.id == document_id, Document.workspace_id == workspace_id
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")


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


@router.post("/", response_model=AIJobResponse, status_code=status.HTTP_201_CREATED)
async def trigger_ai_job(
    workspace_id: uuid.UUID,
    body: AIJobCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: Workspace = Depends(get_workspace),
):
    if body.document_id is not None:
        await _validate_document(body.document_id, workspace_id, db)

    job = AIJob(
        workspace_id=workspace_id,
        requested_by_user_id=current_user.id,
        document_id=body.document_id,
        job_type=body.job_type,
        status="queued",
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job


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
