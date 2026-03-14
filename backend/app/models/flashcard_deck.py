"""SQLAlchemy ORM model for a named collection of flashcards."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.study_subject import StudySubject
    from app.models.study_session import StudySession
    from app.models.flashcard import Flashcard
    from app.models.document import Document


class FlashcardDeck(Base):
    """
    Groups Flashcards into a logical collection.
    Can be linked to a Subject, Session, or Document for hierarchy.
    """
    __tablename__ = "flashcard_decks"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    
    # Optional contexts mapping this deck to larger study structures
    study_subject_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("study_subjects.id", ondelete="SET NULL"), nullable=True, index=True
    )
    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("study_sessions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    document_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("documents.id", ondelete="SET NULL"), nullable=True
    )

    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    # UI Customization
    color_hex: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    icon: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    # Identifies origin: 'ai' if generated entirely by the LLM vs 'user' if created manually
    source: Mapped[str] = mapped_column(String, nullable=False, default="user")
    
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    ai_generated: Mapped[bool] = mapped_column(Boolean, default=False) # True if AI assisted in creation
    
    # Denormalized stats for fast dashboard rendering without counting child rows
    total_flashcards: Mapped[int] = mapped_column(Integer, default=0)
    mastered_flashcards: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    last_studied_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="flashcard_decks", lazy="selectin")
    study_subject: Mapped[Optional["StudySubject"]] = relationship(
        "StudySubject", back_populates="flashcard_decks", lazy="selectin"
    )
    session: Mapped[Optional["StudySession"]] = relationship("StudySession", lazy="selectin")
    document: Mapped[Optional["Document"]] = relationship("Document", lazy="selectin")
    flashcards: Mapped[List["Flashcard"]] = relationship(
        "Flashcard", back_populates="deck", cascade="all, delete-orphan", lazy="noload"
    )
