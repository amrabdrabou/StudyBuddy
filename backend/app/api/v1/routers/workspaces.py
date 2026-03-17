"""Workspace router — CRUD for user-owned workspaces."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.api.v1.deps import apply_updates, get_or_404
from app.core.db_setup import get_db
from app.models.subject import Subject
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.workspace import WorkspaceCreate, WorkspaceResponse, WorkspaceUpdate

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


async def _validate_subject(subject_id: uuid.UUID, user: User, db: AsyncSession) -> None:
    result = await db.execute(
        select(Subject.id).where(Subject.id == subject_id, Subject.user_id == user.id)
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")


@router.get("/", response_model=list[WorkspaceResponse])
async def list_workspaces(
    subject_id: uuid.UUID | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = select(Workspace).where(Workspace.user_id == current_user.id)
    if subject_id is not None:
        query = query.where(Workspace.subject_id == subject_id)
    if status is not None:
        query = query.where(Workspace.status == status)
    query = query.order_by(Workspace.updated_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    body: WorkspaceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    await _validate_subject(body.subject_id, current_user, db)
    workspace = Workspace(user_id=current_user.id, **body.model_dump())
    db.add(workspace)
    await db.commit()
    await db.refresh(workspace)
    return workspace


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace_by_id(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return await get_or_404(
        db, Workspace, "Workspace not found",
        Workspace.id == workspace_id,
        Workspace.user_id == current_user.id,
    )


@router.patch("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(
    workspace_id: uuid.UUID,
    body: WorkspaceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    workspace = await get_or_404(
        db, Workspace, "Workspace not found",
        Workspace.id == workspace_id,
        Workspace.user_id == current_user.id,
    )
    apply_updates(workspace, body.model_dump(exclude_unset=True))
    await db.commit()
    await db.refresh(workspace)
    return workspace


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    workspace = await get_or_404(
        db, Workspace, "Workspace not found",
        Workspace.id == workspace_id,
        Workspace.user_id == current_user.id,
    )
    await db.delete(workspace)
    await db.commit()
