"""API router for querying a user's progress snapshots over time."""
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.core.db_setup import get_db
from app.models.progress_snapshot import ProgressSnapshot
from app.models.user import User
from app.schema.progress_snapshot import ProgressSnapshotCreate, ProgressSnapshotResponse

router = APIRouter(prefix="/progress", tags=["progress"])


@router.get("/", response_model=list[ProgressSnapshotResponse])
async def list_snapshots(
    snapshot_type: str | None = None,
    learning_goal_id: UUID | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
    limit: int = Query(90, ge=1, le=365),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(ProgressSnapshot).where(ProgressSnapshot.user_id == current_user.id)
    if snapshot_type:
        query = query.where(ProgressSnapshot.snapshot_type == snapshot_type)
    if learning_goal_id:
        query = query.where(ProgressSnapshot.learning_goal_id == learning_goal_id)
    if from_date:
        query = query.where(ProgressSnapshot.snapshot_date >= from_date)
    if to_date:
        query = query.where(ProgressSnapshot.snapshot_date <= to_date)
    result = await db.execute(
        query.order_by(ProgressSnapshot.snapshot_date.desc()).limit(limit)
    )
    return result.scalars().all()


@router.post("/", response_model=ProgressSnapshotResponse, status_code=status.HTTP_201_CREATED)
async def create_snapshot(
    payload: ProgressSnapshotCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    snapshot = ProgressSnapshot(user_id=current_user.id, **payload.model_dump())
    db.add(snapshot)
    await db.commit()
    await db.refresh(snapshot)
    return snapshot
