"""API router for logging and retrieving AI events that occurred during a session."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.api.v1.utils import get_owned_session
from app.core.config import get_settings
from app.core.db_setup import get_db
from app.core.limiter import limiter
from app.models.session_ai_event import SessionAiEvent
from app.models.user import User
from app.schemas.session_ai_event import (
    SessionAiEventCreate,
    SessionAiEventResponse,
    SessionAiEventUpdate,
)

_settings = get_settings()

router = APIRouter(prefix="/sessions/{session_id}/ai-events", tags=["session-ai-events"])


async def _get_event(session_id: UUID, event_id: UUID, db: AsyncSession) -> SessionAiEvent:
    result = await db.execute(
        select(SessionAiEvent).where(
            SessionAiEvent.id == event_id,
            SessionAiEvent.session_id == session_id,
        )
    )
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI event not found")
    return event


@router.get("/", response_model=list[SessionAiEventResponse])
async def list_ai_events(
    session_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_session(session_id, current_user, db)
    result = await db.execute(
        select(SessionAiEvent)
        .where(SessionAiEvent.session_id == session_id)
        .order_by(SessionAiEvent.triggered_at)
    )
    return result.scalars().all()


@router.post("/", response_model=SessionAiEventResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(_settings.ai_event_rate_limit)
async def create_ai_event(
    request: Request,
    session_id: UUID,
    payload: SessionAiEventCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_session(session_id, current_user, db)
    event = SessionAiEvent(
        session_id=session_id,
        event_type=payload.event_type,
        content=payload.content,
        event_metadata=payload.event_metadata,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


@router.patch("/{event_id}", response_model=SessionAiEventResponse)
async def acknowledge_ai_event(
    session_id: UUID,
    event_id: UUID,
    payload: SessionAiEventUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_session(session_id, current_user, db)
    event = await _get_event(session_id, event_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(event, field, value)
    await db.commit()
    await db.refresh(event)
    return event
