"""SQLAlchemy ORM model for individual text chunks used in vector search."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.document import Document


class DocumentChunk(Base):
    """
    Represents a small, semantically meaningful slice of a Document's text.
    Used for Retrieval-Augmented Generation (RAG) by embedding this text
    and performing similarity searches against user queries.
    """
    __tablename__ = "document_chunks"
    __table_args__ = (UniqueConstraint("document_id", "chunk_index"),)

    document_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    
    # Sequential ordering of chunks within the document
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # The page this chunk was primarily extracted from (for citation purposes)
    page_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # The actual text content to be embedded and passed to the LLM
    chunk_text: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Pre-calculated token length to ensure we don't exceed LLM context windows during retrieval
    token_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # The mathematical representation of the chunk's semantic meaning.
    # Scheduled to be un-commented when `pgvector` extension is enabled in PostgreSQL:
    # embedding: Mapped[Optional[list]] = mapped_column(Vector(1536), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    document: Mapped["Document"] = relationship(
        "Document", back_populates="chunks", lazy="selectin"
    )
