"""SQLAlchemy ORM model representing a timed study session."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, SmallInteger, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.study_subject import StudySubject
    from app.models.learning_goal import LearningGoal
    from app.models.flashcard_reviews import FlashcardReview
    from app.models.session_participant import SessionParticipant
    from app.models.session_document import SessionDocument
    from app.models.session_topic import SessionTopic
    from app.models.micro_goal import MicroGoal
    from app.models.session_ai_event import SessionAiEvent
    from app.models.quiz_set import QuizSet
    from app.models.quiz_attempt import QuizAttempt
    from app.models.session_reflection import SessionReflection
    from app.models.session_recommendation import SessionRecommendation
    from app.models.ai_suggestion import AiSuggestion
    from app.models.timeline_event import TimelineEvent


class StudySession(Base):
    """
    The core entity of the application. Represents a discrete period of focused learning.
    Manages the lifecycle from intention -> AI planning -> active studying -> reflection.
    """
    __tablename__ = "study_sessions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Optional parent organizational grouping
    study_subject_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("study_subjects.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # Which big LearningGoal this session contributes toward (optional)
    learning_goal_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("learning_goals.id", ondelete="SET NULL"), nullable=True, index=True
    )

    title: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    # broad categorization: solo | group | exam_sim | review | lecture
    session_type: Mapped[str] = mapped_column(String, nullable=False)
    
    # State machine: pending | active | paused | completed | abandoned
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")

    # --- Phase 1: Context Gathering ---
    # Raw user intention (typed before AI analysis, e.g., "I need to cram for my bio test")
    intention_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Structured categorization: exam_prep | deep_understanding | quick_review | practice
    intention_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # --- Phase 2: AI Planning ---
    # AI-refined session goal (replaces the older separate StudyGoal table)
    # Populated by AI after analysing the intention_text + uploaded session_documents
    goal_title: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    goal_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Tracks user approval of the plan: suggested | accepted | rejected  (None = no AI plan yet)
    goal_status: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # Timing
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    actual_started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Cached progress (updated as micro_goals are completed)
    progress_pct: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    micro_goals_total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    micro_goals_done: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Post-session self-assessment
    mood_rating: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    productivity_rating: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    focus_score: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    notes_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    user: Mapped["User"] = relationship("User", back_populates="study_sessions", lazy="selectin")
    study_subject: Mapped[Optional["StudySubject"]] = relationship(
        "StudySubject", back_populates="study_sessions", lazy="selectin"
    )
    learning_goal: Mapped[Optional["LearningGoal"]] = relationship(
        "LearningGoal", back_populates="sessions", lazy="selectin"
    )

    # Micro-goals (actionable steps)
    micro_goals: Mapped[List["MicroGoal"]] = relationship(
        "MicroGoal", back_populates="session", cascade="all, delete-orphan", lazy="noload"
    )

    # Collaboration
    participants: Mapped[List["SessionParticipant"]] = relationship(
        "SessionParticipant", back_populates="session", cascade="all, delete-orphan", lazy="noload"
    )

    # Documents
    session_documents: Mapped[List["SessionDocument"]] = relationship(
        "SessionDocument", back_populates="session", cascade="all, delete-orphan", lazy="noload"
    )
    session_topics: Mapped[List["SessionTopic"]] = relationship(
        "SessionTopic", back_populates="session", cascade="all, delete-orphan", lazy="noload"
    )

    # Quizzes & Flashcards
    quiz_sets: Mapped[List["QuizSet"]] = relationship(
        "QuizSet", back_populates="session", cascade="all, delete-orphan", lazy="noload"
    )
    quiz_attempts: Mapped[List["QuizAttempt"]] = relationship(
        "QuizAttempt", back_populates="session", cascade="all, delete-orphan", lazy="noload"
    )
    flashcard_reviews: Mapped[List["FlashcardReview"]] = relationship(
        "FlashcardReview", back_populates="study_session", cascade="all, delete-orphan", lazy="noload"
    )

    # AI
    ai_events: Mapped[List["SessionAiEvent"]] = relationship(
        "SessionAiEvent", back_populates="session", cascade="all, delete-orphan", lazy="noload"
    )
    ai_suggestions: Mapped[List["AiSuggestion"]] = relationship(
        "AiSuggestion", back_populates="session", cascade="all, delete-orphan", lazy="noload"
    )
    recommendations: Mapped[List["SessionRecommendation"]] = relationship(
        "SessionRecommendation", back_populates="source_session", cascade="all, delete-orphan", lazy="noload"
    )

    # Timeline & Reflections
    timeline_events: Mapped[List["TimelineEvent"]] = relationship(
        "TimelineEvent", back_populates="session", cascade="all, delete-orphan", lazy="noload"
    )
    reflections: Mapped[List["SessionReflection"]] = relationship(
        "SessionReflection", back_populates="session", cascade="all, delete-orphan", lazy="noload"
    )
