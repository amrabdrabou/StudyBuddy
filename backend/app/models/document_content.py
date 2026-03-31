"""SQLAlchemy ORM model storing the full extracted text content of a document."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.document import Document


class DocumentContent(Base):
    """
    Stores the heavy text payloads for a Document.
    Separated from the main Document table to keep list queries lightweight.
    """
    __tablename__ = "document_contents"

    # 1:1 relationship enforcing that a Document has at most one DocumentContent
    document_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True, unique=True
    )

    # Full extracted text from the document (used as a fallback for search or large context AI)
    raw_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Per-page content as JSONB: [{"page": 1, "text": "..."}]
    # Useful for rendering page-by-page views in the frontend without re-parsing.
    pages_json: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)

    # AI-generated executive summary of the whole document
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Number of pages detected during extraction
    page_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Word count of raw_text (populated post-extraction, useful for reading time estimates)
    word_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Expected ISO language code (e.g. "en", "ar") for search stemming or LLM prompts
    language: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)

    # Tracks which underlying tool parsed the file (e.g. "pdfplumber", "tesseract", "azure_di")
    extraction_engine: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    extracted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    document: Mapped["Document"] = relationship(
        "Document", back_populates="content", lazy="selectin"
    )
