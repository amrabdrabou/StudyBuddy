"""Session model — a timed focus block inside a workspace."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, SmallInteger, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.workspace import Workspace
    from app.models.user import User
    from app.models.session_micro_goal import SessionMicroGoal
    from app.models.flashcard_review import FlashcardReview
    from app.models.note import Note


# active | paused | completed | abandoned
SESSION_STATUSES = {"active", "paused", "completed", "abandoned"}


class Session(Base):
    __tablename__ = "sessions"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)

    # Timer
    planned_duration_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Post-session reflection
    mood_rating: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    productivity_rating: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    notes_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    workspace: Mapped["Workspace"] = relationship(
        "Workspace", back_populates="sessions", lazy="noload"
    )
    user: Mapped["User"] = relationship(
        "User", back_populates="sessions", lazy="noload"
    )
    session_micro_goals: Mapped[List["SessionMicroGoal"]] = relationship(
        "SessionMicroGoal", back_populates="session", cascade="all, delete-orphan", lazy="selectin"
    )
    flashcard_reviews: Mapped[List["FlashcardReview"]] = relationship(
        "FlashcardReview", back_populates="session", cascade="all, delete-orphan", lazy="noload"
    )
    notes: Mapped[List["Note"]] = relationship(
        "Note", back_populates="session", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<Session {self.title!r} status={self.status}>"
