"""Flashcard reviews router — SRS review events linked to sessions."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

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
from app.services import progress_service

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

    # Validate session belongs to user (if provided)
    if body.session_id is not None:
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
    # review.reviewed_at is a server_default — not yet populated before commit.
    # Use the client-side timestamp so the value is always non-None.
    fc.last_reviewed_at = datetime.now(timezone.utc)
    fc.next_review_at = body.next_review_at
    fc.repetitions = (fc.repetitions or 0) + 1

    await db.commit()
    await db.refresh(review)

    # Trigger progress cascade when review belongs to a session (best-effort)
    if body.session_id is not None:
        try:
            await progress_service.update_session_progress(
                body.session_id,
                current_user.id,
                db,
                source_type="flashcard",
                source_id=review.id,
            )
            await db.commit()
        except Exception:
            pass

    return review
