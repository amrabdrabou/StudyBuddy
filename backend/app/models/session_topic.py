from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.study_session import StudySession
    from app.models.micro_goal import MicroGoal
    from app.models.quiz_question import QuizQuestion


class SessionTopic(Base):
    __tablename__ = "session_topics"

    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("study_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    topic_name: Mapped[str] = mapped_column(String, nullable=False)
    # ai | user_added
    source: Mapped[str] = mapped_column(String, nullable=False, default="ai")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    session: Mapped["StudySession"] = relationship(
        "StudySession", back_populates="session_topics", lazy="selectin"
    )
    micro_goals: Mapped[List["MicroGoal"]] = relationship(
        "MicroGoal", back_populates="topic", lazy="noload"
    )
    quiz_questions: Mapped[List["QuizQuestion"]] = relationship(
        "QuizQuestion", back_populates="topic", lazy="noload"
    )
