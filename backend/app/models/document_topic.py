"""SQLAlchemy ORM model for AI-extracted topics within a document."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.document import Document


class DocumentTopic(Base):
    """
    Represents an automatically detected or user-specified topic within a document.
    Used for semantic linking across different study materials.
    """
    __tablename__ = "document_topics"

    document_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    
    # The normalized concept (e.g. 'Photosynthesis', 'World War II')
    topic_name: Mapped[str] = mapped_column(String, nullable=False)
    
    # AI's certainty that this topic is central to the document (0.0 to 1.0)
    confidence_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    # E.g., "1-5" to tell the user where this topic is discussed
    source_page_range: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    
    # True if the user explicitly validated this was a correct extraction
    is_confirmed_by_user: Mapped[bool] = mapped_column(Boolean, default=False)
    confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Tracks explicit curation: 'accepted', 'removed' (for bad AI guesses), or 'added' (manual)
    user_action: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    document: Mapped["Document"] = relationship("Document", back_populates="detected_topics", lazy="selectin")
