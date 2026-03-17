"""MicroGoal router — CRUD for workspace micro goals."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import apply_updates, get_workspace
from app.core.db_setup import get_db
from app.models.micro_goal import MicroGoal
from app.models.workspace import Workspace
from app.schemas.micro_goal import MicroGoalCreate, MicroGoalResponse, MicroGoalUpdate

router = APIRouter(prefix="/workspaces/{workspace_id}/micro-goals", tags=["micro-goals"])


async def _get_micro_goal_or_404(
    micro_goal_id: uuid.UUID, workspace_id: uuid.UUID, db: AsyncSession
) -> MicroGoal:
    result = await db.execute(
        select(MicroGoal).where(
            MicroGoal.id == micro_goal_id, MicroGoal.workspace_id == workspace_id
        )
    )
    mg = result.scalar_one_or_none()
    if mg is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MicroGoal not found")
    return mg


@router.get("/", response_model=list[MicroGoalResponse])
async def list_micro_goals(
    workspace_id: uuid.UUID,
    status_filter: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: Workspace = Depends(get_workspace),
):
    query = select(MicroGoal).where(MicroGoal.workspace_id == workspace_id)
    if status_filter:
        query = query.where(MicroGoal.status == status_filter)
    query = query.order_by(MicroGoal.order_index, MicroGoal.created_at)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=MicroGoalResponse, status_code=status.HTTP_201_CREATED)
async def create_micro_goal(
    workspace_id: uuid.UUID,
    body: MicroGoalCreate,
    db: AsyncSession = Depends(get_db),
    _: Workspace = Depends(get_workspace),
):
    mg = MicroGoal(workspace_id=workspace_id, **body.model_dump())
    db.add(mg)
    await db.commit()
    await db.refresh(mg)
    return mg


@router.get("/{micro_goal_id}", response_model=MicroGoalResponse)
async def get_micro_goal(
    workspace_id: uuid.UUID,
    micro_goal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Workspace = Depends(get_workspace),
):
    return await _get_micro_goal_or_404(micro_goal_id, workspace_id, db)


@router.patch("/{micro_goal_id}", response_model=MicroGoalResponse)
async def update_micro_goal(
    workspace_id: uuid.UUID,
    micro_goal_id: uuid.UUID,
    body: MicroGoalUpdate,
    db: AsyncSession = Depends(get_db),
    _: Workspace = Depends(get_workspace),
):
    mg = await _get_micro_goal_or_404(micro_goal_id, workspace_id, db)
    apply_updates(mg, body.model_dump(exclude_unset=True))
    await db.commit()
    await db.refresh(mg)
    return mg


@router.delete("/{micro_goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_micro_goal(
    workspace_id: uuid.UUID,
    micro_goal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Workspace = Depends(get_workspace),
):
    mg = await _get_micro_goal_or_404(micro_goal_id, workspace_id, db)
    await db.delete(mg)
    await db.commit()
