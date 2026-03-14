"""SQLAlchemy ORM model recording a user's attempt at completing a quiz set."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.quiz_set import QuizSet
    from app.models.study_session import StudySession
    from app.models.user import User
    from app.models.quiz_attempt_answer import QuizAttemptAnswer


class QuizAttempt(Base):
    """
    One attempt = one user sitting down to answer all questions in a QuizSet.
    Individual per-question answers are stored in quiz_attempt_answers.
    score_pct is cached on completion (sum of correct / total questions).
    """
    __tablename__ = "quiz_attempts"

    quiz_set_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("quiz_sets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # denormalized for fast dashboard queries — avoids join through quiz_set
    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("study_sessions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # in_progress | completed | abandoned
    status: Mapped[str] = mapped_column(String, nullable=False, default="in_progress")
    # cached on completion
    score_pct: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    time_taken_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    quiz_set: Mapped["QuizSet"] = relationship(
        "QuizSet", back_populates="attempts", lazy="selectin"
    )
    session: Mapped[Optional["StudySession"]] = relationship(
        "StudySession", back_populates="quiz_attempts", lazy="selectin"
    )
    user: Mapped["User"] = relationship("User", lazy="selectin")
    answers: Mapped[List["QuizAttemptAnswer"]] = relationship(
        "QuizAttemptAnswer", back_populates="attempt", cascade="all, delete-orphan", lazy="noload"
    )
