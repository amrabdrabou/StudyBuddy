"""SQLAlchemy ORM model for the many-to-many association between documents and tags."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.document import Document
    from app.models.tag import Tag


class DocumentTag(Base):
    """
    Association table linking Documents to Tags for many-to-many relationships.
    Allows organizing unstructured text or PDFs by user-defined categories.
    """
    __tablename__ = "document_tags"

    document_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), primary_key=True
    )
    tag_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # many-to-one → Document
    document: Mapped["Document"] = relationship(
        "Document", back_populates="document_tags", lazy="selectin"
    )

    # many-to-one → Tag
    tag: Mapped["Tag"] = relationship("Tag", back_populates="document_tags", lazy="selectin")
