"""SQLAlchemy ORM model for a user's long-term learning goals."""
from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.study_subject import StudySubject
    from app.models.study_session import StudySession
    from app.models.ai_recommendation import AiRecommendation


class LearningGoal(Base):
    """
    Big long-term goal that sits above individual study sessions.
    Examples: "Finish the Python course", "Pass the calculus exam", "Study 20 hours this month".
    Sessions link to a goal via study_session.learning_goal_id.
    progress_pct is a cached field updated at session_end — never computed live.
    """
    __tablename__ = "learning_goals"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    study_subject_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("study_subjects.id", ondelete="SET NULL"), nullable=True, index=True
    )

    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Determines how progress is tracked:
    # finish_course | exam_prep | hours_target | topic_mastery | custom
    goal_type: Mapped[str] = mapped_column(String, nullable=False, default="custom")
    
    # Lifecycle: active | paused | completed | abandoned
    status: Mapped[str] = mapped_column(String, nullable=False, default="active")

    # Deadline for the goal (e.g. date of the exam)
    target_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    
    # Only applicable if goal_type = "hours_target"
    target_hours: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Expected grade/score (optional metric)
    target_score_pct: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Cached overall completion percentage (0-100) — updated at the end of a study session
    progress_pct: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_hours_logged: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="learning_goals", lazy="selectin")
    study_subject: Mapped[Optional["StudySubject"]] = relationship(
        "StudySubject", back_populates="learning_goals", lazy="selectin"
    )
    # Sessions that contribute toward this goal
    sessions: Mapped[List["StudySession"]] = relationship(
        "StudySession", back_populates="learning_goal", lazy="noload"
    )
    recommendations: Mapped[List["AiRecommendation"]] = relationship(
        "AiRecommendation", back_populates="learning_goal", lazy="noload"
    )
