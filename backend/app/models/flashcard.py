import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.core.db_setup import Base
from backend.app.models.user import User
from backend.app.models.flashcard_deck import Flashcard_deck


class Flashcard(Base):
    __tablename__ = "flashcards"
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    front_content: Mapped[str] = mapped_column(String, nullable=False)
    back_content: Mapped[str] = mapped_column(String, nullable=False)
    front_content_type: Mapped[str] = mapped_column(
        String, nullable=False
    )  # e.g., "text", "image"
    back_content_type: Mapped[str] = mapped_column(
        String, nullable=False
    )  # e.g., "text", "image"
    hint: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    explanation: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    difficulty: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )  # e.g., 1-5
    card_order: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )  # For ordering within a deck
    interval_days: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )  # For spaced repetition
    repetitions: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )  # For spaced repetition
    next_review_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )  # For spaced repetition
    last_reviewed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )  # For tracking review history
    total_reviews: Mapped[int] = mapped_column(
        Integer, default=0
    )  # For tracking review history
    successful_reviews: Mapped[int] = mapped_column(
        Integer, default=0
    )  # For tracking review history
    is_mastered: Mapped[bool] = mapped_column(
        Boolean, default=False
    )  # For tracking if the card is mastered
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)

    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships one-to-many with User
    user: Mapped["User"] = relationship("User", back_populates="flashcards")
    # Relationships many-to-one with Flashcard_deck
    deck: Mapped["Flashcard_deck"] = relationship("Flashcard_deck", back_populates="flashcards")
