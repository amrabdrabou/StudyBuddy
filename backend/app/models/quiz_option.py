"""SQLAlchemy ORM model for a selectable answer option within a quiz question."""
from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, SmallInteger, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.quiz_question import QuizQuestion


class QuizOption(Base):
    """
    A specific multiple-choice answer option for a given QuizQuestion.
    Defines the text of the option and whether it is the correct answer.
    """
    __tablename__ = "quiz_options"

    question_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("quiz_questions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    
    # The text presented to the user
    option_text: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Indicates if selecting this option awards points for the question
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    
    # Display order (e.g., to ensure options appear as A, B, C, D consistently)
    order_index: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)

    question: Mapped["QuizQuestion"] = relationship(
        "QuizQuestion", back_populates="options", lazy="selectin"
    )
