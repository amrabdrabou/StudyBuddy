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
    from app.models.user import User


class FlashcardReview(Base):
    __tablename__ = "flashcard_reviews"

    # Composite PK: one review per flashcard per session
    flashcard_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("flashcards.id", ondelete="CASCADE"), primary_key=True
    )
    study_session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("study_sessions.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    quality_rating: Mapped[int] = mapped_column(Integer, nullable=False)  # SM-2 quality (0-5)
    next_review_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
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

    # many-to-one → User
    user: Mapped["User"] = relationship("User", back_populates="flashcard_reviews", lazy="selectin")
