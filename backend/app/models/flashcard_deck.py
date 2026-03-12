import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.core.db_setup import Base
from backend.app.models.flashcard import Flashcard
from backend.app.models.study_subject import StudySubject
from backend.app.models.user import User


class Flashcard_deck(Base):
    __tablename__ = "flashcard_decks"
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    study_subject_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("study_subjects.id"), nullable=True
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    color_hex: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    icon: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    total_flashcards: Mapped[int] = mapped_column(Integer, default=0)
    mastered_flashcards: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    last_studied_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

# Relationships one-to-many with Flashcard
    flashcards: Mapped[List["Flashcard"]] = relationship("Flashcard", back_populates="deck", cascade="all, delete-orphan")
    
# Relationships many-to-one with StudySubject
    study_subject: Mapped[Optional["StudySubject"]] = relationship("StudySubject", back_populates="flashcard_decks")

# Relationships one-to-many with User
    user: Mapped["User"] = relationship("User", back_populates="flashcard_decks")

# Relationships many-to-many with User through UserFlashcardDeck
    users: Mapped[List["User"]] = relationship("User", back_populates="flashcard_decks")