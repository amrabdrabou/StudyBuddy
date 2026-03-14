"""SQLAlchemy ORM model for real-time AI suggestions surfaced during a study session."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.study_session import StudySession
    from app.models.micro_goal import MicroGoal
    from app.models.quiz_set import QuizSet
    from app.models.flashcard_deck import FlashcardDeck


class AiSuggestion(Base):
    """
    Captures every AI output BEFORE the user acts on it (creates an audit trail).
    On accept → the real domain record is created and the created_*_id FK is set.
    On reject → status = 'rejected'.
    On modify+accept → user_edit_json records what changed prior to creation.

    suggestion_type values:
        micro_goals     — AI-generated step list (payload is a JSON array)
        quiz            — AI-generated quiz set
        flashcard_deck  — AI-generated flashcard set
        session_goal    — AI-refined goal title/description (stored on session columns)
        recommendation  — a dashboard recommendation
    """
    __tablename__ = "ai_suggestions"

    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("study_sessions.id", ondelete="CASCADE"), nullable=True, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    # Identifies the domain object this suggestion models (e.g., 'quiz', 'flashcard_deck')
    suggestion_type: Mapped[str] = mapped_column(String, nullable=False)
    
    # State tracking: pending | accepted | rejected | modified
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")

    # The raw structured output provided by the AI (usually JSON)
    payload_json: Mapped[str] = mapped_column(Text, nullable=False)
    
    # If the user edits the AI's suggestion before accepting, diff/final state is captured here
    user_edit_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Optional metadata for analytics/billing
    model_used: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    prompt_tokens: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    completion_tokens: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # FK to the actual domain record created upon acceptance.
    # Only one of these will be set depending on the `suggestion_type`.
    created_micro_goal_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("micro_goals.id", ondelete="SET NULL"), nullable=True
    )
    created_quiz_set_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("quiz_sets.id", ondelete="SET NULL"), nullable=True
    )
    created_deck_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("flashcard_decks.id", ondelete="SET NULL"), nullable=True
    )

    acted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    session: Mapped[Optional["StudySession"]] = relationship(
        "StudySession", back_populates="ai_suggestions", lazy="selectin"
    )
    user: Mapped["User"] = relationship("User", lazy="selectin")
    created_micro_goal: Mapped[Optional["MicroGoal"]] = relationship(
        "MicroGoal", foreign_keys=[created_micro_goal_id], lazy="noload"
    )
    created_quiz_set: Mapped[Optional["QuizSet"]] = relationship(
        "QuizSet", foreign_keys=[created_quiz_set_id], lazy="noload"
    )
    created_deck: Mapped[Optional["FlashcardDeck"]] = relationship(
        "FlashcardDeck", foreign_keys=[created_deck_id], lazy="noload"
    )
