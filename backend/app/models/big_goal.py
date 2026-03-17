"""BigGoal model — cross-subject, deadline-based goal owned by a user."""
from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime, Date, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.big_goal_subject import BigGoalSubject


# Allowed status values (enforced at application layer via schema)
# active | paused | overdue | ready_to_complete | completed | canceled
BIG_GOAL_STATUSES = {"active", "paused", "overdue", "ready_to_complete", "completed", "canceled"}
# Statuses the user can set manually (system sets ready_to_complete and overdue)
USER_SETTABLE_STATUSES = {"active", "paused", "completed", "canceled"}


class BigGoal(Base):
    __tablename__ = "big_goals"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="active", nullable=False)
    deadline: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    # Cached aggregate — updated by background job or on workspace progress update
    progress_pct: Mapped[int] = mapped_column(default=0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    user: Mapped["User"] = relationship("User", back_populates="big_goals", lazy="noload")
    big_goal_subjects: Mapped[List["BigGoalSubject"]] = relationship(
        "BigGoalSubject", back_populates="big_goal", cascade="all, delete-orphan", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<BigGoal {self.title!r} status={self.status}>"
