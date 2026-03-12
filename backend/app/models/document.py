from datetime import datetime
from sqlalchemy import ForeignKey, Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List
import uuid

from backend.app.core.db_setup import Base
from backend.app.models.document_tag import DocumentTag
from backend.app.models.tag import Tag
from backend.app.models.user import User
from backend.app.models.study_subject import StudySubject
from backend.app.models.note_tag import NoteTag

class Document(Base):
    __tablename__ = "documents"
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    study_subject_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("study_subjects.id"), nullable=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    file_name: Mapped[str] = mapped_column(String, nullable=False)
    file_path: Mapped[str] = mapped_column(String, nullable=False)
    file_type: Mapped[str] = mapped_column(String, nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    processing_status: Mapped[str] = mapped_column(String, nullable=False, default="pending")
    extracted_text: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    page_content: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    summary: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    topics: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    last_accessed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships one-to-many with User
    user: Mapped["User"] = relationship("User", back_populates="documents")
    
    # Relationships many-to-one with StudySubject
    study_subject: Mapped[Optional["StudySubject"]] = relationship("StudySubject", back_populates="documents")

    # Relationships many-to-many with Tag through DocumentTag
    document_tags: Mapped[List["DocumentTag"]] = relationship("DocumentTag", back_populates="document", cascade="all, delete-orphan")
    