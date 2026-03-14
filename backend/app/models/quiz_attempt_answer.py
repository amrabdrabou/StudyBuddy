"""SQLAlchemy ORM model storing the answer a user gave for each question in a quiz attempt."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.quiz_attempt import QuizAttempt
    from app.models.quiz_question import QuizQuestion
    from app.models.quiz_option import QuizOption


class QuizAttemptAnswer(Base):
    """
    Records a user's answer to a specific QuizQuestion during a QuizAttempt.
    Handles both multiple-choice (linked to QuizOption) and short-answer (free text) formats.
    """
    __tablename__ = "quiz_attempt_answers"
    __table_args__ = (UniqueConstraint("attempt_id", "question_id"),)

    attempt_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("quiz_attempts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    question_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("quiz_questions.id", ondelete="CASCADE"), nullable=False
    )
    
    # Used if the question is multiple_choice or true_false
    selected_option_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("quiz_options.id", ondelete="SET NULL"), nullable=True
    )
    
    # Used for short_answer questions where the user types a response
    free_text_answer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Graded result. Null until graded (immediately graded for MC, might be deferred for short_answer via AI grading)
    is_correct: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    answered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    attempt: Mapped["QuizAttempt"] = relationship(
        "QuizAttempt", back_populates="answers"
    )
    question: Mapped["QuizQuestion"] = relationship("QuizQuestion", lazy="selectin")
    selected_option: Mapped[Optional["QuizOption"]] = relationship("QuizOption", lazy="selectin")
