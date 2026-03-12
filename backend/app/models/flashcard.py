from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.flashcard_deck import FlashcardDeck
    from app.models.flashcard_reviews import FlashcardReview


class Flashcard(Base):
    __tablename__ = "flashcards"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    deck_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("flashcard_decks.id", ondelete="CASCADE"), nullable=False, index=True
    )

    front_content: Mapped[str] = mapped_column(String, nullable=False)
    back_content: Mapped[str] = mapped_column(String, nullable=False)
    front_content_type: Mapped[str] = mapped_column(String, nullable=False)  # "text" | "image"
    back_content_type: Mapped[str] = mapped_column(String, nullable=False)   # "text" | "image"
    hint: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    explanation: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    difficulty: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)   # 1-5
    card_order: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Spaced-repetition fields
    interval_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    repetitions: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    next_review_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    total_reviews: Mapped[int] = mapped_column(Integer, default=0)
    successful_reviews: Mapped[int] = mapped_column(Integer, default=0)
    is_mastered: Mapped[bool] = mapped_column(Boolean, default=False)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # many-to-one → User
    user: Mapped["User"] = relationship("User", back_populates="flashcards", lazy="selectin")

    # many-to-one → FlashcardDeck
    deck: Mapped["FlashcardDeck"] = relationship(
        "FlashcardDeck", back_populates="flashcards", lazy="selectin"
    )

    # one-to-many → FlashcardReview
    reviews: Mapped[List["FlashcardReview"]] = relationship(
        "FlashcardReview", back_populates="flashcard", cascade="all, delete-orphan", lazy="noload"
    )
