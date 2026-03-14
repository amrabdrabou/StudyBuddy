"""SQLAlchemy ORM model representing an application user."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.token import Token
    from app.models.tag import Tag
    from app.models.study_subject import StudySubject
    from app.models.note import Note
    from app.models.document import Document
    from app.models.flashcard_deck import FlashcardDeck
    from app.models.study_session import StudySession
    from app.models.study_group import StudyGroup
    from app.models.study_group_member import StudyGroupMember
    from app.models.shared_resource import SharedResource
    from app.models.learning_goal import LearningGoal
    from app.models.timeline_event import TimelineEvent
    from app.models.ai_recommendation import AiRecommendation
    from app.models.progress_snapshot import ProgressSnapshot


class User(Base):
    """
    Core identity model that holds authentication, basic profile data,
    and user-specific AI study preferences.
    Drives all authorization logic using the user_id foreign keys across the system.
    """
    __tablename__ = "users"

    # -- Authentication Fields --
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    username: Mapped[Optional[str]] = mapped_column(String, unique=True, nullable=True)
    hashed_password: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # Identifies the source of truth for auth (e.g. "local", "google", "apple")
    auth_provider: Mapped[str] = mapped_column(String, default="local", nullable=False)
    # The unique ID provided by an external OAuth vendor
    provider_user_id: Mapped[Optional[str]] = mapped_column(String, unique=True, nullable=True)

    # -- Profile Data --
    first_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    profile_picture_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    timezone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    # -- Study Preferences (Used by the AI planner to suggest schedules) --
    study_goal_minutes_per_day: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    preferred_study_time: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # -- State / Access Control --
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    @property
    def full_name(self) -> str:
        return f"{self.first_name or ''} {self.last_name or ''}".strip()

    def __repr__(self) -> str:
        return f"<User {self.email}>"

    # ── Auth ──────────────────────────────────────────────────────────────────
    tokens: Mapped[List["Token"]] = relationship(
        "Token", back_populates="user", cascade="all, delete-orphan", lazy="selectin"
    )

    # ── Direct ownership (user_id on every table) ─────────────────────────────
    tags: Mapped[List["Tag"]] = relationship(
        "Tag", back_populates="user", cascade="all, delete-orphan", lazy="noload"
    )
    study_subjects: Mapped[List["StudySubject"]] = relationship(
        "StudySubject", back_populates="user", cascade="all, delete-orphan", lazy="noload"
    )
    notes: Mapped[List["Note"]] = relationship(
        "Note", back_populates="user", cascade="all, delete-orphan", lazy="noload"
    )
    documents: Mapped[List["Document"]] = relationship(
        "Document", back_populates="user", cascade="all, delete-orphan", lazy="noload"
    )
    flashcard_decks: Mapped[List["FlashcardDeck"]] = relationship(
        "FlashcardDeck", back_populates="user", cascade="all, delete-orphan", lazy="noload"
    )
    study_sessions: Mapped[List["StudySession"]] = relationship(
        "StudySession", back_populates="user", cascade="all, delete-orphan", lazy="noload"
    )
    # ── Long-term goals ───────────────────────────────────────────────────────
    learning_goals: Mapped[List["LearningGoal"]] = relationship(
        "LearningGoal", back_populates="user", cascade="all, delete-orphan", lazy="noload"
    )

    # ── Timeline & AI ─────────────────────────────────────────────────────────
    timeline_events: Mapped[List["TimelineEvent"]] = relationship(
        "TimelineEvent", back_populates="user", cascade="all, delete-orphan", lazy="noload"
    )
    ai_recommendations: Mapped[List["AiRecommendation"]] = relationship(
        "AiRecommendation", back_populates="user", cascade="all, delete-orphan", lazy="noload"
    )
    progress_snapshots: Mapped[List["ProgressSnapshot"]] = relationship(
        "ProgressSnapshot", back_populates="user", cascade="all, delete-orphan", lazy="noload"
    )

    # ── Groups ────────────────────────────────────────────────────────────────
    created_study_groups: Mapped[List["StudyGroup"]] = relationship(
        "StudyGroup",
        back_populates="creator",
        foreign_keys="[StudyGroup.creator_id]",
        lazy="noload",
    )
    study_group_members: Mapped[List["StudyGroupMember"]] = relationship(
        "StudyGroupMember", back_populates="user", cascade="all, delete-orphan", lazy="noload"
    )
    shared_resources: Mapped[List["SharedResource"]] = relationship(
        "SharedResource", back_populates="shared_by_user", cascade="all, delete-orphan", lazy="noload"
    )
