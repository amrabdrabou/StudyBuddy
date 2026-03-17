"""QuizOption model — one selectable answer for a QuizQuestion."""
from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, SmallInteger, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.quiz_question import QuizQuestion


class QuizOption(Base):
    __tablename__ = "quiz_options"

    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("quiz_questions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    option_text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    order_index: Mapped[int] = mapped_column(SmallInteger, default=0, nullable=False)

    # ── Relationships ──────────────────────────────────────────────────────────
    question: Mapped["QuizQuestion"] = relationship(
        "QuizQuestion", back_populates="options", lazy="noload"
    )
