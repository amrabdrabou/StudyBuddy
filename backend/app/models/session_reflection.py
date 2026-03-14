"""SQLAlchemy ORM model for a user's post-session reflection notes."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.study_session import StudySession
    from app.models.session_ai_event import SessionAiEvent


class SessionReflection(Base):
    """
    Stores an individual answer given by the user to an AI-prompted reflection question
    at the end of a study session. Used to gauge subjective learning performance.
    """
    __tablename__ = "session_reflections"

    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("study_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    ai_event_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("session_ai_events.id", ondelete="SET NULL"), nullable=True, index=True
    )

    question_text: Mapped[str] = mapped_column(String, nullable=False)
    user_response: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    responded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    session: Mapped["StudySession"] = relationship(
        "StudySession", back_populates="reflections", lazy="selectin"
    )
    ai_event: Mapped[Optional["SessionAiEvent"]] = relationship(
        "SessionAiEvent", back_populates="reflections", lazy="selectin"
    )
