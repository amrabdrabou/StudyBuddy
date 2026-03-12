from datetime import datetime
from sqlalchemy import ForeignKey, Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List
import uuid

from backend.app.core.db_setup import Base
from backend.app.models.tag import Tag
from backend.app.models.user import User
from backend.app.models.study_subject import StudySubject
from backend.app.models.note_tag import NoteTag

class Note(Base):
    __tablename__ = "notes"
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    study_subject_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("study_subjects.id"), nullable=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    content: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
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

    # Relationships one-to-many with User
    user: Mapped["User"] = relationship("User", back_populates="notes")
    
    # Relationships many-to-one with StudySubject
    study_subject: Mapped[Optional["StudySubject"]] = relationship("StudySubject", back_populates="notes")
    
    # Relationships many-to-many with Tag through NoteTag
    tags: Mapped[List["Tag"]] = relationship("Tag", secondary="note_tags", back_populates="notes")
    
    # Relationships one-to-many with NoteTag
    note_tags: Mapped[List["NoteTag"]] = relationship("NoteTag", back_populates="note")