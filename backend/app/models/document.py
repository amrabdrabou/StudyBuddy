"""Document model — a file uploaded to a workspace."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.workspace import Workspace
    from app.models.user import User
    from app.models.document_content import DocumentContent
    from app.models.document_chunk import DocumentChunk
    from app.models.ai_job import AIJob


# uploaded | processing | ready | failed
DOCUMENT_STATUSES = {"uploaded", "processing", "ready", "failed"}


class Document(Base):
    __tablename__ = "documents"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    uploaded_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    original_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    storage_path: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="uploaded", nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    workspace: Mapped["Workspace"] = relationship(
        "Workspace", back_populates="documents", lazy="noload"
    )
    uploaded_by: Mapped["User"] = relationship(
        "User", back_populates="documents", lazy="noload"
    )
    content: Mapped[Optional["DocumentContent"]] = relationship(
        "DocumentContent", back_populates="document",
        cascade="all, delete-orphan", uselist=False, lazy="noload"
    )
    chunks: Mapped[List["DocumentChunk"]] = relationship(
        "DocumentChunk", back_populates="document",
        cascade="all, delete-orphan", lazy="noload"
    )
    ai_jobs: Mapped[List["AIJob"]] = relationship(
        "AIJob", back_populates="document", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<Document {self.original_filename!r} status={self.status}>"
