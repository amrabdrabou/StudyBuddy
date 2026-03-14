"""SQLAlchemy ORM model linking documents to a study session."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.study_session import StudySession
    from app.models.document import Document


class SessionDocument(Base):
    """
    Many-to-many association representing which documents are actively open or being used
    as context by the AI during a specific study session.
    """
    __tablename__ = "session_documents"

    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("study_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    session: Mapped["StudySession"] = relationship(
        "StudySession", back_populates="session_documents", lazy="selectin"
    )
    document: Mapped["Document"] = relationship("Document", lazy="selectin")
