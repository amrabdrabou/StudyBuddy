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
    from app.models.user_role import UserRole
    from app.models.subject import Subject
    from app.models.big_goal import BigGoal
    from app.models.workspace import Workspace
    from app.models.document import Document
    from app.models.session import Session
    from app.models.ai_job import AIJob
    from app.models.ai_chat_message import AIChatMessage
    from app.models.quiz_set import QuizSet
    from app.models.quiz_attempt import QuizAttempt
    from app.models.note import Note


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
    # lazy="noload": roles are never fetched automatically; the RBAC service
    # queries them explicitly via JOIN when a permission check is required.
    user_roles: Mapped[List["UserRole"]] = relationship(
        "UserRole", back_populates="user", cascade="all, delete-orphan", lazy="noload"
    )

    # ── Subjects & Goals ──────────────────────────────────────────────────────
    subjects: Mapped[List["Subject"]] = relationship(
        "Subject", back_populates="user", cascade="all, delete-orphan", lazy="noload"
    )
    big_goals: Mapped[List["BigGoal"]] = relationship(
        "BigGoal", back_populates="user", cascade="all, delete-orphan", lazy="noload"
    )
    workspaces: Mapped[List["Workspace"]] = relationship(
        "Workspace", back_populates="user", cascade="all, delete-orphan", lazy="noload"
    )
    documents: Mapped[List["Document"]] = relationship(
        "Document", back_populates="uploaded_by",
        foreign_keys="[Document.uploaded_by_user_id]", lazy="noload"
    )
    sessions: Mapped[List["Session"]] = relationship(
        "Session", back_populates="user", cascade="all, delete-orphan", lazy="noload"
    )
    ai_jobs: Mapped[List["AIJob"]] = relationship(
        "AIJob", back_populates="requested_by",
        foreign_keys="[AIJob.requested_by_user_id]", lazy="noload"
    )
    ai_chat_messages: Mapped[List["AIChatMessage"]] = relationship(
        "AIChatMessage", back_populates="user", cascade="all, delete-orphan", lazy="noload"
    )
    quiz_sets: Mapped[List["QuizSet"]] = relationship(
        "QuizSet", back_populates="created_by",
        foreign_keys="[QuizSet.created_by_user_id]", lazy="noload"
    )
    quiz_attempts: Mapped[List["QuizAttempt"]] = relationship(
        "QuizAttempt", back_populates="user", cascade="all, delete-orphan", lazy="noload"
    )
    notes: Mapped[List["Note"]] = relationship(
        "Note", back_populates="user", cascade="all, delete-orphan", lazy="noload"
    )
