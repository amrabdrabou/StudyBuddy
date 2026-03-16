"""Pydantic schemas for flashcard decks and individual flashcard CRUD."""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ── FlashcardDeck ─────────────────────────────────────────────────────────────

class FlashcardDeckBase(BaseModel):
    title: str
    description: Optional[str] = None
    color_hex: Optional[str] = None
    icon: Optional[str] = None
    is_public: bool = False
    study_subject_id: Optional[uuid.UUID] = None  # optional grouping


class FlashcardDeckCreate(FlashcardDeckBase):
    pass


class FlashcardDeckUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    color_hex: Optional[str] = None
    icon: Optional[str] = None
    study_subject_id: Optional[uuid.UUID] = None
    is_public: Optional[bool] = None
    is_archived: Optional[bool] = None


class FlashcardDeckResponse(FlashcardDeckBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    is_archived: bool
    total_flashcards: int
    mastered_flashcards: int
    created_at: datetime
    updated_at: datetime
    last_studied_at: Optional[datetime] = None


# ── Flashcard ─────────────────────────────────────────────────────────────────

class FlashcardBase(BaseModel):
    front_content: str
    back_content: str
    front_content_type: str = "text"
    back_content_type: str = "text"
    hint: Optional[str] = None
    explanation: Optional[str] = None
    difficulty: Optional[int] = None
    card_order: Optional[int] = None


class FlashcardCreate(FlashcardBase):
    deck_id: uuid.UUID


class FlashcardUpdate(BaseModel):
    front_content: Optional[str] = None
    back_content: Optional[str] = None
    front_content_type: Optional[str] = None
    back_content_type: Optional[str] = None
    hint: Optional[str] = None
    explanation: Optional[str] = None
    difficulty: Optional[int] = None
    card_order: Optional[int] = None
    is_public: Optional[bool] = None
    is_archived: Optional[bool] = None


class FlashcardResponse(FlashcardBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    deck_id: uuid.UUID
    interval_days: Optional[int] = None
    repetitions: Optional[int] = None
    next_review_date: Optional[datetime] = None
    last_reviewed_at: Optional[datetime] = None
    total_reviews: int
    successful_reviews: int
    is_mastered: bool
    is_public: bool
    is_archived: bool
    created_at: datetime
    updated_at: datetime


# ── FlashcardReview ───────────────────────────────────────────────────────────

class FlashcardReviewBase(BaseModel):
    quality_rating: int       # SM-2 scale: 0-5
    next_review_date: datetime


class FlashcardReviewCreate(FlashcardReviewBase):
    flashcard_id: uuid.UUID
    study_session_id: uuid.UUID


class FlashcardReviewUpdate(BaseModel):
    quality_rating: Optional[int] = None
    next_review_date: Optional[datetime] = None
    total_reviews: Optional[int] = None
    correct_reviews: Optional[int] = None


class FlashcardReviewResponse(FlashcardReviewBase):
    model_config = ConfigDict(from_attributes=True)

    flashcard_id: uuid.UUID
    study_session_id: uuid.UUID
    total_reviews: int
    correct_reviews: int
    reviewed_at: datetime
    updated_at: datetime
