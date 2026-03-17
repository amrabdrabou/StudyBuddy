"""MicroGoal model — an actionable task inside a workspace."""
from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.workspace import Workspace
    from app.models.session_micro_goal import SessionMicroGoal


# suggested | pending | in_progress | completed | skipped
MICRO_GOAL_STATUSES = {"suggested", "pending", "in_progress", "completed", "skipped"}


class MicroGoal(Base):
    __tablename__ = "micro_goals"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    deadline: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    workspace: Mapped["Workspace"] = relationship(
        "Workspace", back_populates="micro_goals", lazy="noload"
    )
    session_micro_goals: Mapped[List["SessionMicroGoal"]] = relationship(
        "SessionMicroGoal", back_populates="micro_goal", cascade="all, delete-orphan", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<MicroGoal {self.title!r} status={self.status}>"
