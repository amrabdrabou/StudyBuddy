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
    from app.models.flashcard_reviews import FlashcardReview
    from app.models.session_participant import SessionParticipant
    from app.models.session_document import SessionDocument
    from app.models.session_topic import SessionTopic
    from app.models.micro_goal import MicroGoal
    from app.models.session_ai_event import SessionAiEvent
    from app.models.quiz_question import QuizQuestion
    from app.models.quiz_attempt import QuizAttempt
    from app.models.session_reflection import SessionReflection
    from app.models.session_recommendation import SessionRecommendation


class StudySession(Base):
    __tablename__ = "study_sessions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    study_subject_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("study_subjects.id", ondelete="SET NULL"), nullable=True, index=True
    )

    title: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    session_type: Mapped[str] = mapped_column(String, nullable=False)
    # pending | active | completed | abandoned
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")

    intention_text: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    # exam_prep | deep_understanding | quick_review | practice
    intention_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    actual_started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    cards_reviewed: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    cards_correct: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    notes_created: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    notes_edited: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    focus_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    mood_rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    productivity_rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    notes_text: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="study_sessions", lazy="selectin")
    study_subject: Mapped[Optional["StudySubject"]] = relationship(
        "StudySubject", back_populates="study_sessions", lazy="selectin"
    )
    flashcard_reviews: Mapped[List["FlashcardReview"]] = relationship(
        "FlashcardReview", back_populates="study_session", cascade="all, delete-orphan", lazy="noload"
    )
    participants: Mapped[List["SessionParticipant"]] = relationship(
        "SessionParticipant", back_populates="session", cascade="all, delete-orphan", lazy="noload"
    )
    session_documents: Mapped[List["SessionDocument"]] = relationship(
        "SessionDocument", back_populates="session", cascade="all, delete-orphan", lazy="noload"
    )
    session_topics: Mapped[List["SessionTopic"]] = relationship(
        "SessionTopic", back_populates="session", cascade="all, delete-orphan", lazy="noload"
    )
    micro_goals: Mapped[List["MicroGoal"]] = relationship(
        "MicroGoal", back_populates="session", cascade="all, delete-orphan", lazy="noload"
    )
    ai_events: Mapped[List["SessionAiEvent"]] = relationship(
        "SessionAiEvent", back_populates="session", cascade="all, delete-orphan", lazy="noload"
    )
    quiz_questions: Mapped[List["QuizQuestion"]] = relationship(
        "QuizQuestion", back_populates="session", cascade="all, delete-orphan", lazy="noload"
    )
    quiz_attempts: Mapped[List["QuizAttempt"]] = relationship(
        "QuizAttempt", back_populates="session", cascade="all, delete-orphan", lazy="noload"
    )
    reflections: Mapped[List["SessionReflection"]] = relationship(
        "SessionReflection", back_populates="session", cascade="all, delete-orphan", lazy="noload"
    )
    recommendations: Mapped[List["SessionRecommendation"]] = relationship(
        "SessionRecommendation", back_populates="source_session", cascade="all, delete-orphan", lazy="noload"
    )
