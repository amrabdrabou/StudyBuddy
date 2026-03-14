"""SQLAlchemy ORM model for topics covered during a specific study session."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.study_session import StudySession


class SessionTopic(Base):
    """
    Represents a specific subject matter focus area for a single study session.
    Topics can be auto-extracted by AI from the session intention or documents, or added manually.
    """
    __tablename__ = "session_topics"

    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("study_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    topic_name: Mapped[str] = mapped_column(String, nullable=False)
    
    # Track provenance: 'ai' if inferred by the LLM, 'user_added' if explicitly typed by the student
    source: Mapped[str] = mapped_column(String, nullable=False, default="ai")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    session: Mapped["StudySession"] = relationship(
        "StudySession", back_populates="session_topics", lazy="selectin"
    )
