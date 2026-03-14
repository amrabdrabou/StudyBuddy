"""API router for creating and tracking micro-goals within a study session."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.api.v1.utils import get_owned_session
from app.core.db_setup import get_db
from app.models.micro_goal import MicroGoal
from app.models.user import User
from app.schema.micro_goal import MicroGoalCreate, MicroGoalResponse, MicroGoalUpdate

router = APIRouter(prefix="/sessions/{session_id}/micro-goals", tags=["micro-goals"])


async def _get_micro_goal(session_id: UUID, micro_goal_id: UUID, db: AsyncSession) -> MicroGoal:
    result = await db.execute(
        select(MicroGoal).where(
            MicroGoal.id == micro_goal_id,
            MicroGoal.session_id == session_id,
        )
    )
    goal = result.scalar_one_or_none()
    if goal is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Micro-goal not found")
    return goal


@router.get("/", response_model=list[MicroGoalResponse])
async def list_micro_goals(
    session_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_session(session_id, current_user, db)
    result = await db.execute(
        select(MicroGoal)
        .where(MicroGoal.session_id == session_id)
        .order_by(MicroGoal.order_index)
    )
    return result.scalars().all()


@router.post("/", response_model=MicroGoalResponse, status_code=status.HTTP_201_CREATED)
async def create_micro_goal(
    session_id: UUID,
    payload: MicroGoalCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_session(session_id, current_user, db)
    goal = MicroGoal(session_id=session_id, **payload.model_dump(exclude={"session_id"}))
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return goal


@router.patch("/{micro_goal_id}", response_model=MicroGoalResponse)
async def update_micro_goal(
    session_id: UUID,
    micro_goal_id: UUID,
    payload: MicroGoalUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_session(session_id, current_user, db)
    goal = await _get_micro_goal(session_id, micro_goal_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(goal, field, value)
    await db.commit()
    await db.refresh(goal)
    return goal


@router.delete("/{micro_goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_micro_goal(
    session_id: UUID,
    micro_goal_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_session(session_id, current_user, db)
    goal = await _get_micro_goal(session_id, micro_goal_id, db)
    await db.delete(goal)
    await db.commit()
