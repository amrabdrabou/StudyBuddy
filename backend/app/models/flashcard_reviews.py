"""SQLAlchemy ORM model tracking a user's spaced-repetition review of a flashcard."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.flashcard import Flashcard
    from app.models.study_session import StudySession


class FlashcardReview(Base):
    """
    Records an individual study attempt for a flashcard within a study session.
    Used to track historical performance and calculate the next interval using spaced repetition.
    """
    __tablename__ = "flashcard_reviews"

    # Composite PK logically: one ultimate review record per flashcard per session
    flashcard_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("flashcards.id", ondelete="CASCADE"), primary_key=True
    )
    study_session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("study_sessions.id", ondelete="CASCADE"), primary_key=True
    )

    # SuperMemo-2 (SM-2) quality rating:
    # 0=Blackout, 1=Wrong, 2=Wrong (easy), 3=Hard, 4=Good, 5=Perfect
    quality_rating: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # Calculated immediately after the review based on the rating
    next_review_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    
    # Historical counters cached on the review for analytics (e.g. how many tries it took to get here)
    total_reviews: Mapped[int] = mapped_column(Integer, default=0)
    correct_reviews: Mapped[int] = mapped_column(Integer, default=0)

    reviewed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # many-to-one → Flashcard
    flashcard: Mapped["Flashcard"] = relationship(
        "Flashcard", back_populates="reviews", lazy="selectin"
    )

    # many-to-one → StudySession
    study_session: Mapped["StudySession"] = relationship(
        "StudySession", back_populates="flashcard_reviews", lazy="selectin"
    )
