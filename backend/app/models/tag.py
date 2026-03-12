from datetime import datetime
from typing import List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.core.db_setup import Base
from backend.app.models.note import Note
from backend.app.models.note_tag import NoteTag
from backend.app.models.user import User


class Tag(Base):
    __tablename__ = "tags"

    name: Mapped[str] = mapped_column(unique=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    color_hex: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    icon: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships many-to-many with User
    users: Mapped[List["User"]] = relationship(
        "User", secondary="user_tags", back_populates="tags"
    )

    # Relationships many-to-many with Note through NoteTag
    notes: Mapped[List["Note"]] = relationship(
        "Note", secondary="note_tags", back_populates="tags"
    )
    # Relationships one-to-many with NoteTag
    note_tags: Mapped[List["NoteTag"]] = relationship("NoteTag", back_populates="tag")