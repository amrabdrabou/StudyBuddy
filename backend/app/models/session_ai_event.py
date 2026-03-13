from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.study_session import StudySession
    from app.models.session_reflection import SessionReflection
    from app.models.session_recommendation import SessionRecommendation


class SessionAiEvent(Base):
    __tablename__ = "session_ai_events"

    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("study_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # overview | checkpoint | quiz_generation | summary | reflection | next_plan
    event_type: Mapped[str] = mapped_column(String, nullable=False)
    content: Mapped[str] = mapped_column(String, nullable=False)

    triggered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    user_acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Flexible per-event payload (model params, topic refs, difficulty signals, etc.)
    event_metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        "metadata", JSONB, nullable=True
    )

    session: Mapped["StudySession"] = relationship(
        "StudySession", back_populates="ai_events", lazy="selectin"
    )
    reflections: Mapped[List["SessionReflection"]] = relationship(
        "SessionReflection", back_populates="ai_event", lazy="noload"
    )
    recommendations: Mapped[List["SessionRecommendation"]] = relationship(
        "SessionRecommendation", back_populates="ai_event", lazy="noload"
    )
