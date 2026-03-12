from datetime import datetime
from sqlalchemy import ForeignKey, Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List
import uuid

from backend.app.core.db_setup import Base
from backend.app.models.note import Note
from backend.app.models.tag import Tag

class NoteTag(Base):
    __tablename__ = "note_tags"
    note_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("notes.id"), primary_key=True)
    tag_id: Mapped[int] = mapped_column(ForeignKey("tags.id"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships many-to-one with Note
    note: Mapped["Note"] = relationship("Note", back_populates="note_tags")
    # Relationships many-to-one with Tag
    tag: Mapped["Tag"] = relationship("Tag", back_populates="note_tags")