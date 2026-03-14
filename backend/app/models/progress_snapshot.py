"""SQLAlchemy ORM model storing a periodic snapshot of a user's study progress."""
from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.learning_goal import LearningGoal
    from app.models.study_session import StudySession


class ProgressSnapshot(Base):
    """
    Precomputed progress summary — never calculated live during normal UI rendering.
    Written by a background job (or inline at session end).
    The frontend dashboard reads from here instead of running expensive aggregations over thousands of events.

    snapshot_type:
        session_end — written immediately when a study session is completed.
        daily       — written once per day by an async scheduled job.
        weekly      — written once per week by an async scheduled job.
    """
    __tablename__ = "progress_snapshots"
    __table_args__ = (
        UniqueConstraint("user_id", "snapshot_type", "snapshot_date", "learning_goal_id"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    
    # Optional dimension: was this progress tied to a specific goal?
    learning_goal_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("learning_goals.id", ondelete="SET NULL"), nullable=True
    )
    # Optional provenance: which session generated this data? (useful for session_end type)
    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("study_sessions.id", ondelete="SET NULL"), nullable=True
    )

    # Identifies the temporal granularity: session_end | daily | weekly
    snapshot_type: Mapped[str] = mapped_column(String, nullable=False)
    
    # The calendar date this snapshot represents
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False)

    # --- Aggregated Metrics ---
    total_study_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    sessions_completed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    micro_goals_completed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    
    quiz_attempts_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    quiz_avg_score_pct: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    
    flashcards_reviewed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    flashcards_correct_pct: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    
    documents_processed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    
    # Overall percentage completion of the attached learning goal at the time of snapshot
    # Only set when learning_goal_id is present
    goal_progress_pct: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship(
        "User", back_populates="progress_snapshots", lazy="selectin"
    )
    learning_goal: Mapped[Optional["LearningGoal"]] = relationship(
        "LearningGoal", lazy="selectin"
    )
    session: Mapped[Optional["StudySession"]] = relationship("StudySession", lazy="selectin")
