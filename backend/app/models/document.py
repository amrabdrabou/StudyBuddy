"""SQLAlchemy ORM model for uploaded study documents."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional  # noqa: F401 (List used in body)

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.study_subject import StudySubject
    from app.models.document_tag import DocumentTag
    from app.models.document_topic import DocumentTopic
    from app.models.document_content import DocumentContent
    from app.models.document_chunk import DocumentChunk


class Document(Base):
    """
    Represents an uploaded study resource (e.g., PDF, Text file).
    Tracks metadata and the status of background processing steps (like OCR or extraction).
    """
    __tablename__ = "documents"

    # Direct owner — enables fast authorization and filtering without complex joins
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Optional subject grouping for organization
    study_subject_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("study_subjects.id", ondelete="SET NULL"), nullable=True, index=True
    )
    
    title: Mapped[str] = mapped_column(String, nullable=False)
    file_name: Mapped[str] = mapped_column(String, nullable=False)
    file_path: Mapped[str] = mapped_column(String, nullable=False) # Physical/cloud storage path
    file_type: Mapped[str] = mapped_column(String, nullable=False) # MIME type or extension
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # State machine for file ingestion: pending | processing | completed | failed
    processing_status: Mapped[str] = mapped_column(String, nullable=False, default="pending")
    
    # Denormalized raw text cache (if appropriate). Can be populated by OCR or PDF extraction
    extracted_text: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    page_content: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    # AI-generated brief summary of the document's contents
    summary: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    # Comma-separated or JSON list of raw topics (before they are normalized into DocumentTopic records)
    topics_raw: Mapped[Optional[str]] = mapped_column("topics", String, nullable=True)
    
    # Soft-delete or hide from active views
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)

    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_accessed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="documents", lazy="selectin")
    study_subject: Mapped[Optional["StudySubject"]] = relationship(
        "StudySubject", back_populates="documents", lazy="selectin"
    )
    document_tags: Mapped[List["DocumentTag"]] = relationship(
        "DocumentTag", back_populates="document", cascade="all, delete-orphan", lazy="selectin"
    )
    detected_topics: Mapped[List["DocumentTopic"]] = relationship(
        "DocumentTopic", back_populates="document", cascade="all, delete-orphan", lazy="noload"
    )
    content: Mapped[Optional["DocumentContent"]] = relationship(
        "DocumentContent", back_populates="document", cascade="all, delete-orphan",
        uselist=False, lazy="noload"
    )
    chunks: Mapped[List["DocumentChunk"]] = relationship(
        "DocumentChunk", back_populates="document", cascade="all, delete-orphan", lazy="noload"
    )
