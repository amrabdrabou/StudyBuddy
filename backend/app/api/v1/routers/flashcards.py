"""Flashcard reviews router — SRS review events linked to sessions."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.core.db_setup import get_db
from app.models.flashcard import Flashcard
from app.models.flashcard_review import FlashcardReview
from app.models.session import Session
from app.models.user import User
from app.schemas.flashcard import FlashcardReviewCreate, FlashcardReviewResponse

router = APIRouter(prefix="/flashcard-reviews", tags=["flashcards"])


@router.post("/", response_model=FlashcardReviewResponse, status_code=status.HTTP_201_CREATED)
async def record_review(
    body: FlashcardReviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    # Validate flashcard exists
    fc = await db.get(Flashcard, body.flashcard_id)
    if fc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Flashcard not found")

    # Validate session belongs to user
    sess_result = await db.execute(
        select(Session).where(Session.id == body.session_id, Session.user_id == current_user.id)
    )
    if sess_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    review = FlashcardReview(
        flashcard_id=body.flashcard_id,
        session_id=body.session_id,
        quality_rating=body.quality_rating,
        next_review_at=body.next_review_at,
    )
    db.add(review)

    # Update card SRS fields
    fc.last_reviewed_at = review.reviewed_at
    fc.next_review_at = body.next_review_at
    fc.repetitions = (fc.repetitions or 0) + 1

    await db.commit()
    await db.refresh(review)
    return review
