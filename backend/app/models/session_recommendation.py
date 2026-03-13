from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.study_session import StudySession
    from app.models.study_subject import StudySubject
    from app.models.session_ai_event import SessionAiEvent


class SessionRecommendation(Base):
    __tablename__ = "session_recommendations"

    source_session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("study_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    recommended_subject_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("study_subjects.id", ondelete="SET NULL"), nullable=True, index=True
    )
    ai_event_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("session_ai_events.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # JSON list of topic name strings
    suggested_topics: Mapped[Optional[List[Any]]] = mapped_column(JSONB, nullable=True)
    suggested_duration_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    reasoning: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    # dismissed | accepted | scheduled
    user_action: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    source_session: Mapped["StudySession"] = relationship(
        "StudySession", back_populates="recommendations", lazy="selectin"
    )
    recommended_subject: Mapped[Optional["StudySubject"]] = relationship(
        "StudySubject", lazy="selectin"
    )
    ai_event: Mapped[Optional["SessionAiEvent"]] = relationship(
        "SessionAiEvent", back_populates="recommendations", lazy="selectin"
    )
