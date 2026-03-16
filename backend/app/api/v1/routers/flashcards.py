"""API router for CRUD operations on individual flashcards and SRS reviews."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.core.db_setup import get_db
from app.models.flashcard import Flashcard
from app.models.flashcard_deck import FlashcardDeck
from app.models.flashcard_reviews import FlashcardReview
from app.models.user import User
from app.schemas.flashcard import (
    FlashcardCreate,
    FlashcardResponse,
    FlashcardReviewCreate,
    FlashcardReviewResponse,
    FlashcardUpdate,
)

router = APIRouter(prefix="/flashcards", tags=["flashcards"])


async def _get_owned_flashcard(card_id: UUID, user: User, db: AsyncSession) -> Flashcard:
    result = await db.execute(
        select(Flashcard)
        .join(FlashcardDeck, Flashcard.deck_id == FlashcardDeck.id)
        .where(Flashcard.id == card_id, FlashcardDeck.user_id == user.id)
    )
    card = result.scalar_one_or_none()
    if card is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Flashcard not found")
    return card


# ── Flashcards ────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[FlashcardResponse])
async def list_flashcards(
    deck_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify deck ownership
    result = await db.execute(
        select(FlashcardDeck).where(
            FlashcardDeck.id == deck_id, FlashcardDeck.user_id == current_user.id
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Flashcard deck not found")

    result = await db.execute(
        select(Flashcard)
        .where(Flashcard.deck_id == deck_id, Flashcard.is_archived == False)
        .order_by(Flashcard.card_order.nullslast(), Flashcard.created_at)
    )
    return result.scalars().all()


@router.post("/", response_model=FlashcardResponse, status_code=status.HTTP_201_CREATED)
async def create_flashcard(
    payload: FlashcardCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify deck ownership
    result = await db.execute(
        select(FlashcardDeck).where(
            FlashcardDeck.id == payload.deck_id, FlashcardDeck.user_id == current_user.id
        )
    )
    deck = result.scalar_one_or_none()
    if deck is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Flashcard deck not found")

    card = Flashcard(**payload.model_dump())
    db.add(card)

    # Update denormalized count
    deck.total_flashcards = (deck.total_flashcards or 0) + 1

    await db.commit()
    await db.refresh(card)
    return card


@router.get("/{card_id}", response_model=FlashcardResponse)
async def get_flashcard(
    card_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await _get_owned_flashcard(card_id, current_user, db)


@router.patch("/{card_id}", response_model=FlashcardResponse)
async def update_flashcard(
    card_id: UUID,
    payload: FlashcardUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    card = await _get_owned_flashcard(card_id, current_user, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(card, field, value)
    await db.commit()
    await db.refresh(card)
    return card


@router.delete("/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_flashcard(
    card_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    card = await _get_owned_flashcard(card_id, current_user, db)

    # Update denormalized count on the parent deck
    result = await db.execute(
        select(FlashcardDeck).where(FlashcardDeck.id == card.deck_id)
    )
    deck = result.scalar_one_or_none()
    if deck and deck.total_flashcards > 0:
        deck.total_flashcards -= 1
        if card.is_mastered and deck.mastered_flashcards > 0:
            deck.mastered_flashcards -= 1

    await db.delete(card)
    await db.commit()


# ── Flashcard Reviews (SRS) ───────────────────────────────────────────────────

@router.get("/{card_id}/reviews", response_model=list[FlashcardReviewResponse])
async def list_reviews(
    card_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_flashcard(card_id, current_user, db)
    result = await db.execute(
        select(FlashcardReview)
        .where(FlashcardReview.flashcard_id == card_id)
        .order_by(FlashcardReview.reviewed_at.desc())
    )
    return result.scalars().all()


@router.post("/{card_id}/reviews", response_model=FlashcardReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_review(
    card_id: UUID,
    payload: FlashcardReviewCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    card = await _get_owned_flashcard(card_id, current_user, db)

    # Upsert: one review record per (flashcard, session)
    result = await db.execute(
        select(FlashcardReview).where(
            FlashcardReview.flashcard_id == card_id,
            FlashcardReview.study_session_id == payload.study_session_id,
        )
    )
    review = result.scalar_one_or_none()

    if review:
        review.quality_rating = payload.quality_rating
        review.next_review_date = payload.next_review_date
        review.total_reviews = (review.total_reviews or 0) + 1
        if payload.quality_rating >= 3:
            review.correct_reviews = (review.correct_reviews or 0) + 1
    else:
        review = FlashcardReview(
            flashcard_id=card_id,
            study_session_id=payload.study_session_id,
            quality_rating=payload.quality_rating,
            next_review_date=payload.next_review_date,
            total_reviews=1,
            correct_reviews=1 if payload.quality_rating >= 3 else 0,
        )
        db.add(review)

    # Sync SRS fields back onto the flashcard
    card.next_review_date = payload.next_review_date
    card.last_reviewed_at = review.reviewed_at
    card.total_reviews = (card.total_reviews or 0) + 1
    if payload.quality_rating >= 3:
        card.successful_reviews = (card.successful_reviews or 0) + 1

    await db.commit()
    await db.refresh(review)
    return review
