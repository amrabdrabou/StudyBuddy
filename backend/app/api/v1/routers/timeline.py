"""API router for retrieving a user's chronological study timeline events."""
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.core.db_setup import get_db
from app.models.timeline_event import TimelineEvent
from app.models.user import User
from app.schemas.timeline_event import TimelineEventCreate, TimelineEventResponse

router = APIRouter(prefix="/timeline", tags=["timeline"])


@router.get("/", response_model=list[TimelineEventResponse])
async def list_events(
    session_id: UUID | None = None,
    event_type: str | None = None,
    entity_type: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(TimelineEvent).where(TimelineEvent.user_id == current_user.id)
    if session_id:
        query = query.where(TimelineEvent.session_id == session_id)
    if event_type:
        query = query.where(TimelineEvent.event_type == event_type)
    if entity_type:
        query = query.where(TimelineEvent.entity_type == entity_type)
    result = await db.execute(
        query.order_by(TimelineEvent.created_at.desc()).offset(offset).limit(limit)
    )
    return result.scalars().all()


@router.post("/", response_model=TimelineEventResponse, status_code=201)
async def create_event(
    payload: TimelineEventCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    event = TimelineEvent(user_id=current_user.id, **payload.model_dump())
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event
