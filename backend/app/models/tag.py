"""SQLAlchemy ORM model for user-defined tags used to label content."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.note_tag import NoteTag
    from app.models.document_tag import DocumentTag


class Tag(Base):
    """
    User-defined labels that can be attached to various resources (like Notes and Documents).
    Provides flexible, cross-subject organization of study materials.
    """
    __tablename__ = "tags"

    # Tags are owned by a single user (1:M, not M:M)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String, index=True)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    color_hex: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    icon: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # many-to-one → User
    user: Mapped["User"] = relationship("User", back_populates="tags", lazy="selectin")

    # one-to-many → NoteTag / DocumentTag (association rows)
    note_tags: Mapped[List["NoteTag"]] = relationship(
        "NoteTag", back_populates="tag", cascade="all, delete-orphan", lazy="noload"
    )
    document_tags: Mapped[List["DocumentTag"]] = relationship(
        "DocumentTag", back_populates="tag", cascade="all, delete-orphan", lazy="noload"
    )
