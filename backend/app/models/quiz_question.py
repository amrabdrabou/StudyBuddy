"""SQLAlchemy ORM model for an individual quiz question belonging to a quiz set."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, SmallInteger, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.quiz_set import QuizSet
    from app.models.quiz_option import QuizOption
    from app.models.document_chunk import DocumentChunk


class QuizQuestion(Base):
    """
    An individual question within a QuizSet.
    Supports multiple formats (multiple choice, true/false, short answer).
    For multiple choice questions, the possible answers are stored in QuizOption.
    """
    __tablename__ = "quiz_questions"

    quiz_set_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("quiz_sets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # nullable — lets us trace backward to exactly which chunk of text the AI used to generate this question
    source_chunk_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("document_chunks.id", ondelete="SET NULL"), nullable=True
    )

    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Format of the question: multiple_choice | true_false | short_answer
    question_type: Mapped[str] = mapped_column(String, nullable=False, default="multiple_choice")
    
    # Used directly for true_false and short_answer.
    # Always null for multiple_choice (correct option is marked via QuizOption.is_correct)
    correct_answer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Why this is the correct answer. Shown to the user after they submit their response.
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Assessed difficulty: easy | medium | hard
    difficulty: Mapped[str] = mapped_column(String, nullable=False, default="medium")
    order_index: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    ai_generated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    quiz_set: Mapped["QuizSet"] = relationship(
        "QuizSet", back_populates="questions", lazy="selectin"
    )
    options: Mapped[List["QuizOption"]] = relationship(
        "QuizOption", back_populates="question", cascade="all, delete-orphan", lazy="selectin"
    )
    source_chunk: Mapped[Optional["DocumentChunk"]] = relationship(
        "DocumentChunk", lazy="noload"
    )
