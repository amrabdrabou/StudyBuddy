"""BigGoal router — CRUD for cross-subject deadline goals."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.api.v1.deps import apply_updates, get_or_404
from app.core.db_setup import get_db
from app.models.big_goal import BigGoal
from app.models.big_goal_subject import BigGoalSubject
from app.models.subject import Subject
from app.models.user import User
from app.schemas.big_goal import BigGoalCreate, BigGoalResponse, BigGoalUpdate

router = APIRouter(prefix="/big-goals", tags=["big-goals"])


async def _validate_subject_ids(
    subject_ids: list[uuid.UUID], user: User, db: AsyncSession
) -> None:
    """Ensure all provided subject IDs belong to the current user."""
    if not subject_ids:
        return
    result = await db.execute(
        select(Subject.id).where(Subject.id.in_(subject_ids), Subject.user_id == user.id)
    )
    found = {row[0] for row in result.all()}
    missing = set(subject_ids) - found
    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unknown subject IDs: {[str(m) for m in missing]}",
        )


async def _sync_subjects(
    goal: BigGoal, subject_ids: list[uuid.UUID], db: AsyncSession
) -> None:
    """Replace the goal's subject links with the given list."""
    existing = await db.execute(
        select(BigGoalSubject).where(BigGoalSubject.big_goal_id == goal.id)
    )
    for link in existing.scalars().all():
        await db.delete(link)
    for sid in subject_ids:
        db.add(BigGoalSubject(big_goal_id=goal.id, subject_id=sid))


@router.get("/", response_model=list[BigGoalResponse])
async def list_big_goals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(BigGoal)
        .where(BigGoal.user_id == current_user.id)
        .order_by(BigGoal.created_at.desc())
    )
    goals = result.scalars().all()
    return [BigGoalResponse.from_orm_with_subjects(g) for g in goals]


@router.post("/", response_model=BigGoalResponse, status_code=status.HTTP_201_CREATED)
async def create_big_goal(
    body: BigGoalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    await _validate_subject_ids(body.subject_ids, current_user, db)

    goal = BigGoal(
        user_id=current_user.id,
        title=body.title,
        description=body.description,
        deadline=body.deadline,
    )
    db.add(goal)
    await db.flush()

    for sid in body.subject_ids:
        db.add(BigGoalSubject(big_goal_id=goal.id, subject_id=sid))

    await db.commit()
    await db.refresh(goal)
    return BigGoalResponse.from_orm_with_subjects(goal)


@router.get("/{goal_id}", response_model=BigGoalResponse)
async def get_big_goal(
    goal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    goal = await get_or_404(db, BigGoal, "BigGoal not found",
        BigGoal.id == goal_id, BigGoal.user_id == current_user.id)
    return BigGoalResponse.from_orm_with_subjects(goal)


@router.patch("/{goal_id}", response_model=BigGoalResponse)
async def update_big_goal(
    goal_id: uuid.UUID,
    body: BigGoalUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    goal = await get_or_404(db, BigGoal, "BigGoal not found",
        BigGoal.id == goal_id, BigGoal.user_id == current_user.id)

    update_data = body.model_dump(exclude_unset=True)
    subject_ids = update_data.pop("subject_ids", None)
    apply_updates(goal, update_data)

    if subject_ids is not None:
        await _validate_subject_ids(subject_ids, current_user, db)
        await _sync_subjects(goal, subject_ids, db)

    await db.commit()
    await db.refresh(goal)
    return BigGoalResponse.from_orm_with_subjects(goal)


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_big_goal(
    goal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    goal = await get_or_404(db, BigGoal, "BigGoal not found",
        BigGoal.id == goal_id, BigGoal.user_id == current_user.id)
    await db.delete(goal)
    await db.commit()
