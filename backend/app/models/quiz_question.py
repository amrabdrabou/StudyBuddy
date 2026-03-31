"""QuizQuestion model — one question inside a QuizSet."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, SmallInteger, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.quiz_set import QuizSet
    from app.models.quiz_option import QuizOption


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    quiz_set_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("quiz_sets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    # multiple_choice | true_false | short_answer
    question_type: Mapped[str] = mapped_column(String(30), default="multiple_choice", nullable=False)
    # Used for true_false / short_answer; null for multiple_choice
    correct_answer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # easy | medium | hard
    difficulty: Mapped[str] = mapped_column(String(10), default="medium", nullable=False)
    order_index: Mapped[int] = mapped_column(SmallInteger, default=0, nullable=False)
    ai_generated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    quiz_set: Mapped["QuizSet"] = relationship(
        "QuizSet", back_populates="questions", lazy="noload"
    )
    options: Mapped[List["QuizOption"]] = relationship(
        "QuizOption",
        back_populates="question",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="QuizOption.order_index",
    )
