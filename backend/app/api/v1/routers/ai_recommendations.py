"""API router for listing and dismissing user-level AI study recommendations."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.core.db_setup import get_db
from app.models.ai_recommendation import AiRecommendation
from app.models.user import User
from app.schemas.ai_recommendation import (
    AiRecommendationCreate,
    AiRecommendationResponse,
    AiRecommendationUpdate,
)

router = APIRouter(prefix="/ai-recommendations", tags=["ai-recommendations"])


async def _get_owned(rec_id: UUID, user: User, db: AsyncSession) -> AiRecommendation:
    result = await db.execute(
        select(AiRecommendation).where(
            AiRecommendation.id == rec_id, AiRecommendation.user_id == user.id
        )
    )
    rec = result.scalar_one_or_none()
    if rec is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation not found")
    return rec


@router.get("/", response_model=list[AiRecommendationResponse])
async def list_recommendations(
    include_dismissed: bool = False,
    recommendation_type: str | None = None,
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(AiRecommendation).where(AiRecommendation.user_id == current_user.id)
    if not include_dismissed:
        query = query.where(AiRecommendation.is_dismissed == False)  # noqa: E712
    if recommendation_type:
        query = query.where(AiRecommendation.recommendation_type == recommendation_type)
    result = await db.execute(
        query.order_by(AiRecommendation.created_at.desc()).limit(limit)
    )
    return result.scalars().all()


@router.post("/", response_model=AiRecommendationResponse, status_code=status.HTTP_201_CREATED)
async def create_recommendation(
    payload: AiRecommendationCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    rec = AiRecommendation(user_id=current_user.id, **payload.model_dump())
    db.add(rec)
    await db.commit()
    await db.refresh(rec)
    return rec


@router.patch("/{rec_id}", response_model=AiRecommendationResponse)
async def update_recommendation(
    rec_id: UUID,
    payload: AiRecommendationUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    rec = await _get_owned(rec_id, current_user, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(rec, field, value)
    await db.commit()
    await db.refresh(rec)
    return rec


@router.post("/{rec_id}/dismiss", response_model=AiRecommendationResponse)
async def dismiss_recommendation(
    rec_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    rec = await _get_owned(rec_id, current_user, db)
    rec.is_dismissed = True
    await db.commit()
    await db.refresh(rec)
    return rec


@router.delete("/{rec_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recommendation(
    rec_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    rec = await _get_owned(rec_id, current_user, db)
    await db.delete(rec)
    await db.commit()
