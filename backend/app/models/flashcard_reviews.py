from datetime import datetime
from sqlalchemy import ForeignKey, Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List
import uuid

from backend.app.core.db_setup import Base
from backend.app.models.user import User
from backend.app.models.study_subject import StudySubject
from backend.app.models.note_tag import NoteTag
from backend.app.models.flashcard import Flashcard

class FlashcardReview(Base):
    __tablename__ = "flashcard_reviews"
    flashcard_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("flashcards.id"), primary_key=True)
    study_session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("study_sessions.id"), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    quality_rating: Mapped[int] = mapped_column(Integer, nullable=False)
    next_review_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_reviewed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    total_reviews: Mapped[int] = mapped_column(Integer, default=0)
    correct_reviews: Mapped[int] = mapped_column(Integer, default=0)
    reviewed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    
    
    # Relationships many-to-one with Flashcard
    flashcard: Mapped["Flashcard"] = relationship("Flashcard", back_populates="reviews")