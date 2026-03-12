from datetime import datetime
from sqlalchemy import ForeignKey, Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List
import uuid

from backend.app.core.db_setup import Base
from backend.app.models.user import User
from backend.app.models.note import Note
from backend.app.models.document import Document

class StudySubject(Base):
    __tablename__ = "study_subjects"
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    color_hex: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    icon: Mapped[Optional[str]] = mapped_column(String, nullable=True)
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
    user: Mapped["User"] = relationship("User", back_populates="study_subjects")
    # Relationships one-to-many with Note
    notes: Mapped[List["Note"]] = relationship("Note", back_populates="study_subject")
    # Relationships one-to-many with Document
    documents: Mapped[List["Document"]] = relationship("Document", back_populates="study_subject")  