"""Pydantic v2 schemas for FlashcardDeck, Flashcard, and FlashcardReview."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ── Deck ──────────────────────────────────────────────────────────────────────

class FlashcardDeckCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = None
    color_hex: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    icon: Optional[str] = Field(None, max_length=50)


class FlashcardDeckUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    description: Optional[str] = None
    color_hex: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    icon: Optional[str] = Field(None, max_length=50)


class FlashcardDeckResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    title: str
    description: Optional[str]
    color_hex: Optional[str]
    icon: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Card ──────────────────────────────────────────────────────────────────────

class FlashcardCreate(BaseModel):
    front_content: str = Field(..., min_length=1)
    back_content: str = Field(..., min_length=1)
    hint: Optional[str] = None
    order_index: int = 0


class FlashcardUpdate(BaseModel):
    front_content: Optional[str] = Field(None, min_length=1)
    back_content: Optional[str] = Field(None, min_length=1)
    hint: Optional[str] = None
    order_index: Optional[int] = None
    is_mastered: Optional[bool] = None


class FlashcardResponse(BaseModel):
    id: uuid.UUID
    deck_id: uuid.UUID
    front_content: str
    back_content: str
    hint: Optional[str]
    order_index: int
    interval_days: Optional[int]
    repetitions: int
    next_review_at: Optional[datetime]
    last_reviewed_at: Optional[datetime]
    is_mastered: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Review ────────────────────────────────────────────────────────────────────

class FlashcardReviewCreate(BaseModel):
    flashcard_id: uuid.UUID
    session_id: uuid.UUID
    quality_rating: int = Field(..., ge=0, le=5)
    next_review_at: datetime


class FlashcardReviewResponse(BaseModel):
    id: uuid.UUID
    flashcard_id: uuid.UUID
    session_id: uuid.UUID
    quality_rating: int
    next_review_at: datetime
    total_reviews: int
    correct_reviews: int
    reviewed_at: datetime

    model_config = {"from_attributes": True}
