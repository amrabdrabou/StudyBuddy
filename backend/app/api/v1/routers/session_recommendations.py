from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.api.v1.utils import get_owned_session
from app.core.db_setup import get_db
from app.models.session_recommendation import SessionRecommendation
from app.models.user import User
from app.schema.session_recommendation import (
    SessionRecommendationCreate,
    SessionRecommendationResponse,
    SessionRecommendationUpdate,
)

router = APIRouter(prefix="/sessions/{session_id}/recommendations", tags=["session-recommendations"])


async def _get_recommendation(session_id: UUID, rec_id: UUID, db: AsyncSession) -> SessionRecommendation:
    result = await db.execute(
        select(SessionRecommendation).where(
            SessionRecommendation.id == rec_id,
            SessionRecommendation.source_session_id == session_id,
        )
    )
    rec = result.scalar_one_or_none()
    if rec is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation not found")
    return rec


@router.get("/", response_model=list[SessionRecommendationResponse])
async def list_recommendations(
    session_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_session(session_id, current_user, db)
    result = await db.execute(
        select(SessionRecommendation).where(
            SessionRecommendation.source_session_id == session_id
        ).order_by(SessionRecommendation.created_at.desc())
    )
    return result.scalars().all()


@router.post("/", response_model=SessionRecommendationResponse, status_code=status.HTTP_201_CREATED)
async def create_recommendation(
    session_id: UUID,
    payload: SessionRecommendationCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_session(session_id, current_user, db)
    rec = SessionRecommendation(
        source_session_id=session_id,
        **payload.model_dump(exclude={"source_session_id"}),
    )
    db.add(rec)
    await db.commit()
    await db.refresh(rec)
    return rec


@router.patch("/{rec_id}", response_model=SessionRecommendationResponse)
async def update_recommendation(
    session_id: UUID,
    rec_id: UUID,
    payload: SessionRecommendationUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_session(session_id, current_user, db)
    rec = await _get_recommendation(session_id, rec_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(rec, field, value)
    await db.commit()
    await db.refresh(rec)
    return rec
