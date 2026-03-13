from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.study_session import StudySession
    from app.models.micro_goal import MicroGoal
    from app.models.session_topic import SessionTopic
    from app.models.quiz_attempt import QuizAttempt


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("study_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    micro_goal_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("micro_goals.id", ondelete="SET NULL"), nullable=True, index=True
    )
    topic_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("session_topics.id", ondelete="SET NULL"), nullable=True, index=True
    )

    question_text: Mapped[str] = mapped_column(String, nullable=False)
    # multiple_choice | true_false | short_answer
    question_type: Mapped[str] = mapped_column(String, nullable=False, default="multiple_choice")
    # JSON array of choice strings for MCQ, null otherwise
    options: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    correct_answer: Mapped[str] = mapped_column(String, nullable=False)
    explanation: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    # 1–5
    difficulty: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    ai_generated: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    session: Mapped["StudySession"] = relationship(
        "StudySession", back_populates="quiz_questions", lazy="selectin"
    )
    micro_goal: Mapped[Optional["MicroGoal"]] = relationship(
        "MicroGoal", back_populates="quiz_questions", lazy="selectin"
    )
    topic: Mapped[Optional["SessionTopic"]] = relationship(
        "SessionTopic", back_populates="quiz_questions", lazy="selectin"
    )
    attempts: Mapped[List["QuizAttempt"]] = relationship(
        "QuizAttempt", back_populates="question", cascade="all, delete-orphan", lazy="noload"
    )
