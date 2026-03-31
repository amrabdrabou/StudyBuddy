"""Join table — links a Session to the MicroGoals it is working on."""
from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.session import Session
    from app.models.micro_goal import MicroGoal


class SessionMicroGoal(Base):
    __tablename__ = "session_micro_goals"
    __table_args__ = (
        UniqueConstraint("session_id", "micro_goal_id", name="uq_session_micro_goal"),
    )

    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    micro_goal_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("micro_goals.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Contribution weight for weighted-average microgoal progress.
    # Default 1.0 = equal weight.  Set higher for more important sessions.
    weight: Mapped[float] = mapped_column(
        Numeric(5, 4), nullable=False, default=1.0
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    session: Mapped["Session"] = relationship("Session", back_populates="session_micro_goals")
    micro_goal: Mapped["MicroGoal"] = relationship("MicroGoal", back_populates="session_micro_goals")
