"""SQLAlchemy ORM model linking users as participants in a collaborative study session."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.study_session import StudySession


class SessionParticipant(Base):
    """
    Association table for multiplayer study sessions.
    Tracks which users are in the session and their permissions (roles).
    """
    __tablename__ = "session_participants"

    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("study_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    
    # Permission level: owner | participant | viewer
    role: Mapped[str] = mapped_column(String, nullable=False, default="participant")
    
    # Lifecycle: pending | accepted | declined
    invite_status: Mapped[str] = mapped_column(String, nullable=False, default="pending")

    invited_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    joined_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    session: Mapped["StudySession"] = relationship(
        "StudySession", back_populates="participants", lazy="selectin"
    )
    user: Mapped["User"] = relationship("User", lazy="selectin")
