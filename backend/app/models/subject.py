"""Subject model — a top-level study category owned by a user."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.workspace import Workspace
    from app.models.big_goal_subject import BigGoalSubject
    from app.models.note import Note


class Subject(Base):
    __tablename__ = "subjects"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    color_hex: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)
    icon: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    user: Mapped["User"] = relationship("User", back_populates="subjects", lazy="noload")
    workspaces: Mapped[List["Workspace"]] = relationship(
        "Workspace", back_populates="subject", cascade="all, delete-orphan", lazy="noload"
    )
    big_goal_subjects: Mapped[List["BigGoalSubject"]] = relationship(
        "BigGoalSubject", back_populates="subject", cascade="all, delete-orphan", lazy="noload"
    )
    notes: Mapped[List["Note"]] = relationship(
        "Note", back_populates="subject", cascade="all, delete-orphan", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<Subject {self.name!r} user={self.user_id}>"
