from datetime import datetime
from turtle import title
from sqlalchemy import ForeignKey, Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List
import uuid

from backend.app.core.db_setup import Base
from backend.app.models.user import User
from backend.app.models.study_subject import StudySubject

class StudySession(Base):
    __tablename__ = "study_sessions"
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    study_subject_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("study_subjects.id"), nullable=True
    )
    session_type: Mapped[str] = mapped_column(String, nullable=False)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_mintutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    cared_reviewed_flashcards: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    card_correct: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    notes_created: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    notes_edited: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    focus_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    mood_rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    productivity_rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    notes_text: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
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

    # Relationships many-to-one with User
    user: Mapped["User"] = relationship("User", back_populates="study_sessions")
    
    # Relationships many-to-one with StudySubject
    study_subject: Mapped[Optional["StudySubject"]] = relationship("StudySubject", back_populates="study_sessions")
