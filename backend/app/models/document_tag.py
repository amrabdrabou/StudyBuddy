from datetime import datetime
from sqlalchemy import ForeignKey, Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List
import uuid

from backend.app.core.db_setup import Base
from backend.app.models.tag import Tag
from backend.app.models.user import User
from backend.app.models.study_subject import StudySubject
from backend.app.models.document import Document

class DocumentTag(Base):
    __tablename__ = "document_tags"
    document_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("documents.id"), primary_key=True)
    tag_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tags.id"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    
    # Relationships many-to-one with Document
    document: Mapped["Document"] = relationship("Document", back_populates="note_tags")
    
    # Relationships many-to-one with Tag
    tag: Mapped["Tag"] = relationship("Tag", back_populates="document_tags")