from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.study_session import StudySession
    from app.models.study_goal import StudyGoal
    from app.models.session_topic import SessionTopic
    from app.models.quiz_question import QuizQuestion


class MicroGoal(Base):
    __tablename__ = "micro_goals"

    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("study_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    parent_goal_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("study_goals.id", ondelete="SET NULL"), nullable=True, index=True
    )
    topic_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("session_topics.id", ondelete="SET NULL"), nullable=True, index=True
    )

    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    estimated_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # pending | in_progress | completed | skipped
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")
    ai_generated: Mapped[bool] = mapped_column(Boolean, default=True)
    user_modified: Mapped[bool] = mapped_column(Boolean, default=False)
    original_ai_text: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    session: Mapped["StudySession"] = relationship(
        "StudySession", back_populates="micro_goals", lazy="selectin"
    )
    parent_goal: Mapped[Optional["StudyGoal"]] = relationship(
        "StudyGoal", back_populates="micro_goals", lazy="selectin"
    )
    topic: Mapped[Optional["SessionTopic"]] = relationship(
        "SessionTopic", back_populates="micro_goals", lazy="selectin"
    )
    quiz_questions: Mapped[List["QuizQuestion"]] = relationship(
        "QuizQuestion", back_populates="micro_goal", lazy="noload"
    )
