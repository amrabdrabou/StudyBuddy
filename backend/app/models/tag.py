from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base
from app.models.associations import user_tags

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.note_tag import NoteTag
    from app.models.document_tag import DocumentTag


class Tag(Base):
    __tablename__ = "tags"

    name: Mapped[str] = mapped_column(String, unique=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    color_hex: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    icon: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # many-to-many → User
    users: Mapped[List["User"]] = relationship(
        "User", secondary=user_tags, back_populates="tags", lazy="noload"
    )

    # one-to-many → NoteTag (explicit association rows)
    note_tags: Mapped[List["NoteTag"]] = relationship(
        "NoteTag", back_populates="tag", cascade="all, delete-orphan", lazy="noload"
    )

    # one-to-many → DocumentTag (explicit association rows)
    document_tags: Mapped[List["DocumentTag"]] = relationship(
        "DocumentTag", back_populates="tag", cascade="all, delete-orphan", lazy="noload"
    )
