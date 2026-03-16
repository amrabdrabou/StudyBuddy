"""API router for CRUD operations on a user's long-term learning goals."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.core.db_setup import get_db
from app.models.learning_goal import LearningGoal
from app.models.user import User
from app.schemas.learning_goal import LearningGoalCreate, LearningGoalResponse, LearningGoalUpdate

router = APIRouter(prefix="/learning-goals", tags=["learning-goals"])


async def _get_owned_goal(goal_id: UUID, user: User, db: AsyncSession) -> LearningGoal:
    result = await db.execute(
        select(LearningGoal).where(LearningGoal.id == goal_id, LearningGoal.user_id == user.id)
    )
    goal = result.scalar_one_or_none()
    if goal is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learning goal not found")
    return goal


@router.get("/", response_model=list[LearningGoalResponse])
async def list_goals(
    status: str | None = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(LearningGoal).where(LearningGoal.user_id == current_user.id)
    if status:
        query = query.where(LearningGoal.status == status)
    result = await db.execute(query.order_by(LearningGoal.created_at.desc()))
    return result.scalars().all()


@router.post("/", response_model=LearningGoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(
    payload: LearningGoalCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    goal = LearningGoal(user_id=current_user.id, **payload.model_dump())
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return goal


@router.get("/{goal_id}", response_model=LearningGoalResponse)
async def get_goal(
    goal_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await _get_owned_goal(goal_id, current_user, db)


@router.patch("/{goal_id}", response_model=LearningGoalResponse)
async def update_goal(
    goal_id: UUID,
    payload: LearningGoalUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    goal = await _get_owned_goal(goal_id, current_user, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(goal, field, value)
    await db.commit()
    await db.refresh(goal)
    return goal


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    goal = await _get_owned_goal(goal_id, current_user, db)
    await db.delete(goal)
    await db.commit()
