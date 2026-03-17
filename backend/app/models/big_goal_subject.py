"""Association table linking BigGoal ↔ Subject (many-to-many)."""
from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.big_goal import BigGoal
    from app.models.subject import Subject


class BigGoalSubject(Base):
    __tablename__ = "big_goal_subjects"
    __table_args__ = (UniqueConstraint("big_goal_id", "subject_id", name="uq_big_goal_subject"),)

    big_goal_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("big_goals.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    subject_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subjects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    big_goal: Mapped["BigGoal"] = relationship("BigGoal", back_populates="big_goal_subjects")
    subject: Mapped["Subject"] = relationship("Subject", back_populates="big_goal_subjects")
