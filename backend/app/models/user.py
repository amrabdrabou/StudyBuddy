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
    from app.models.study_goal import StudyGoal
    from app.models.study_group import StudyGroup
    from app.models.study_group_member import StudyGroupMember
    from app.models.shared_resource import SharedResource


class User(Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    username: Mapped[Optional[str]] = mapped_column(String, unique=True, nullable=True)
    hashed_password: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    auth_provider: Mapped[str] = mapped_column(String, default="local", nullable=False)
    provider_user_id: Mapped[Optional[str]] = mapped_column(String, unique=True, nullable=True)

    first_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    profile_picture_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    timezone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    study_goal_minutes_per_day: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    preferred_study_time: Mapped[Optional[str]] = mapped_column(String, nullable=True)

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
    study_goals: Mapped[List["StudyGoal"]] = relationship(
        "StudyGoal", back_populates="user", cascade="all, delete-orphan", lazy="noload"
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
