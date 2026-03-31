"""Workspace model — the primary long-lived study container under a Subject."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional  # noqa: F401

from sqlalchemy import DateTime, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.subject import Subject
    from app.models.document import Document
    from app.models.micro_goal import MicroGoal
    from app.models.session import Session
    from app.models.ai_job import AIJob
    from app.models.ai_chat_message import AIChatMessage
    from app.models.flashcard_deck import FlashcardDeck
    from app.models.quiz_set import QuizSet
    from app.models.note import Note


# active | paused | completed | canceled
WORKSPACE_STATUSES = {"active", "paused", "completed", "canceled"}


class Workspace(Base):
    __tablename__ = "workspaces"
    __table_args__ = (
        Index("ix_workspaces_user_status", "user_id", "status"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    subject_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subjects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    user: Mapped["User"] = relationship("User", back_populates="workspaces", lazy="noload")
    subject: Mapped["Subject"] = relationship("Subject", back_populates="workspaces", lazy="selectin")
    documents: Mapped[List["Document"]] = relationship(
        "Document", back_populates="workspace", cascade="all, delete-orphan", lazy="noload"
    )
    micro_goals: Mapped[List["MicroGoal"]] = relationship(
        "MicroGoal", back_populates="workspace", cascade="all, delete-orphan", lazy="noload"
    )
    sessions: Mapped[List["Session"]] = relationship(
        "Session", back_populates="workspace", cascade="all, delete-orphan", lazy="noload"
    )
    ai_jobs: Mapped[List["AIJob"]] = relationship(
        "AIJob", back_populates="workspace", cascade="all, delete-orphan", lazy="noload"
    )
    ai_chat_messages: Mapped[List["AIChatMessage"]] = relationship(
        "AIChatMessage", back_populates="workspace", cascade="all, delete-orphan", lazy="noload"
    )
    flashcard_decks: Mapped[List["FlashcardDeck"]] = relationship(
        "FlashcardDeck", back_populates="workspace", cascade="all, delete-orphan", lazy="noload"
    )
    quiz_sets: Mapped[List["QuizSet"]] = relationship(
        "QuizSet", back_populates="workspace", cascade="all, delete-orphan", lazy="noload"
    )
    notes: Mapped[List["Note"]] = relationship(
        "Note", back_populates="workspace", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<Workspace {self.title!r} status={self.status}>"
