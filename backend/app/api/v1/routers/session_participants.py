from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.api.v1.utils import get_owned_session
from app.core.db_setup import get_db
from app.models.session_participant import SessionParticipant
from app.models.user import User
from app.schema.session_participant import (
    SessionParticipantCreate,
    SessionParticipantResponse,
    SessionParticipantUpdate,
)

router = APIRouter(prefix="/sessions/{session_id}/participants", tags=["session-participants"])


async def _get_participant(session_id: UUID, participant_id: UUID, db: AsyncSession) -> SessionParticipant:
    result = await db.execute(
        select(SessionParticipant).where(
            SessionParticipant.id == participant_id,
            SessionParticipant.session_id == session_id,
        )
    )
    p = result.scalar_one_or_none()
    if p is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Participant not found")
    return p


@router.get("/", response_model=list[SessionParticipantResponse])
async def list_participants(
    session_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_session(session_id, current_user, db)
    result = await db.execute(
        select(SessionParticipant).where(SessionParticipant.session_id == session_id)
    )
    return result.scalars().all()


@router.post("/", response_model=SessionParticipantResponse, status_code=status.HTTP_201_CREATED)
async def invite_participant(
    session_id: UUID,
    payload: SessionParticipantCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_session(session_id, current_user, db)
    participant = SessionParticipant(session_id=session_id, **payload.model_dump())
    db.add(participant)
    await db.commit()
    await db.refresh(participant)
    return participant


@router.patch("/{participant_id}", response_model=SessionParticipantResponse)
async def update_participant(
    session_id: UUID,
    participant_id: UUID,
    payload: SessionParticipantUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_session(session_id, current_user, db)
    participant = await _get_participant(session_id, participant_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(participant, field, value)
    await db.commit()
    await db.refresh(participant)
    return participant


@router.delete("/{participant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_participant(
    session_id: UUID,
    participant_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_session(session_id, current_user, db)
    participant = await _get_participant(session_id, participant_id, db)
    await db.delete(participant)
    await db.commit()
