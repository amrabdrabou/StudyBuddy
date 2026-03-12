from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.study_subject import StudySubject
    from app.models.flashcard_reviews import FlashcardReview


class StudySession(Base):
    __tablename__ = "study_sessions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    study_subject_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("study_subjects.id", ondelete="SET NULL"), nullable=True, index=True
    )
    session_type: Mapped[str] = mapped_column(String, nullable=False)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    cards_reviewed: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    cards_correct: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    notes_created: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    notes_edited: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    focus_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    mood_rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    productivity_rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    notes_text: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # many-to-one → User
    user: Mapped["User"] = relationship("User", back_populates="study_sessions", lazy="selectin")

    # many-to-one → StudySubject (optional)
    study_subject: Mapped[Optional["StudySubject"]] = relationship(
        "StudySubject", back_populates="study_sessions", lazy="selectin"
    )

    # one-to-many → FlashcardReview
    flashcard_reviews: Mapped[List["FlashcardReview"]] = relationship(
        "FlashcardReview", back_populates="study_session", cascade="all, delete-orphan", lazy="noload"
    )
