"""SQLAlchemy ORM model representing a study subject or course."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.note import Note
    from app.models.document import Document
    from app.models.flashcard_deck import FlashcardDeck
    from app.models.study_session import StudySession
    from app.models.learning_goal import LearningGoal


class StudySubject(Base):
    """
    Top-level organizational bucket for a user's materials.
    E.g. "Biology 101" or "AWS Certification".
    Sessions, Documents, Notes, and Goals generally fall under a Subject.
    """
    __tablename__ = "study_subjects"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    color_hex: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    icon: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # many-to-one → User
    user: Mapped["User"] = relationship("User", back_populates="study_subjects", lazy="selectin")

    # one-to-many children
    notes: Mapped[List["Note"]] = relationship(
        "Note", back_populates="study_subject", lazy="noload"
    )
    documents: Mapped[List["Document"]] = relationship(
        "Document", back_populates="study_subject", lazy="noload"
    )
    flashcard_decks: Mapped[List["FlashcardDeck"]] = relationship(
        "FlashcardDeck", back_populates="study_subject", lazy="noload"
    )
    study_sessions: Mapped[List["StudySession"]] = relationship(
        "StudySession", back_populates="study_subject", lazy="noload"
    )
    learning_goals: Mapped[List["LearningGoal"]] = relationship(
        "LearningGoal", back_populates="study_subject", lazy="noload"
    )
