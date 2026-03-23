"""Note model — a user-written note at subject, workspace, or session level."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.subject import Subject
    from app.models.workspace import Workspace
    from app.models.session import Session


class Note(Base):
    """
    A note can be written at three levels:
      - Subject level  : subject_id set, workspace_id null, session_id null
      - Workspace level: subject_id set, workspace_id set,  session_id null
      - Session level  : subject_id set, workspace_id set,  session_id set

    subject_id is ALWAYS populated so a single query can fetch all notes
    for a subject regardless of where they were written.
    """
    __tablename__ = "notes"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Always set — the subject this note ultimately belongs to
    subject_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subjects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Set when the note was written inside a workspace
    workspace_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # Set when the note was written during a session
    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sessions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    title: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    # When True, content holds serialized Tiptap JSON for the canvas editor
    canvas_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    user: Mapped["User"] = relationship("User", back_populates="notes", lazy="noload")
    subject: Mapped["Subject"] = relationship("Subject", back_populates="notes", lazy="noload")
    workspace: Mapped[Optional["Workspace"]] = relationship(
        "Workspace", back_populates="notes", lazy="noload"
    )
    session: Mapped[Optional["Session"]] = relationship(
        "Session", back_populates="notes", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<Note {self.title!r}>"
