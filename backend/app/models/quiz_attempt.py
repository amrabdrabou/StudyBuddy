"""QuizAttempt model — one user sitting down to answer a QuizSet."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime, ForeignKey, Index, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.quiz_set import QuizSet
    from app.models.user import User
    from app.models.quiz_attempt_answer import QuizAttemptAnswer


# in_progress | completed | abandoned | timed_out
QUIZ_ATTEMPT_STATUSES = {"in_progress", "completed", "abandoned", "timed_out"}


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    __table_args__ = (
        Index("ix_quiz_attempts_quiz_user_status", "quiz_set_id", "user_id", "status"),
    )

    quiz_set_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("quiz_sets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    status: Mapped[str] = mapped_column(String(20), default="in_progress", nullable=False)
    # Optional — overrides the quiz_set time_limit for this specific attempt
    time_limit_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    score_pct: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    quiz_set: Mapped["QuizSet"] = relationship(
        "QuizSet", back_populates="attempts", lazy="noload"
    )
    user: Mapped["User"] = relationship(
        "User", back_populates="quiz_attempts", lazy="noload"
    )
    answers: Mapped[List["QuizAttemptAnswer"]] = relationship(
        "QuizAttemptAnswer", back_populates="attempt", cascade="all, delete-orphan", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<QuizAttempt status={self.status} score={self.score_pct}>"
