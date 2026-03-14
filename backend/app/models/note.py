"""SQLAlchemy ORM model for user-created study notes."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.study_subject import StudySubject
    from app.models.note_tag import NoteTag


class Note(Base):
    """
    Represents a rich-text study note created by the user.
    Notes can be solitary or linked to a broader study subject.
    """
    __tablename__ = "notes"

    # Direct owner — enables fast authorization and filtering without complex joins
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Optional grouping under a specific subject
    study_subject_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("study_subjects.id", ondelete="SET NULL"), nullable=True, index=True
    )
    
    title: Mapped[str] = mapped_column(String, nullable=False)
    
    # Rich text content, frequently stored as Markdown or HTML
    content: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    # Keeps main views clean by hiding deleted/archived notes
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="notes", lazy="selectin")
    study_subject: Mapped[Optional["StudySubject"]] = relationship(
        "StudySubject", back_populates="notes", lazy="selectin"
    )
    note_tags: Mapped[List["NoteTag"]] = relationship(
        "NoteTag", back_populates="note", cascade="all, delete-orphan", lazy="selectin"
    )
