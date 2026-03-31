"""ProgressEvent — immutable audit log of every progress change.

Never updated; only inserted.  Provides full history for analytics.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Index, Numeric, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db_setup import Base

# Source types that can trigger a progress change
PROGRESS_SOURCE_TYPES = {"flashcard", "quiz", "session"}


class ProgressEvent(Base):
    """One record per progress delta, keyed by user × entity."""

    __tablename__ = "progress_events"
    __table_args__ = (
        Index("ix_progress_events_user_entity", "user_id", "entity_type", "entity_id"),
        Index("ix_progress_events_timeline", "user_id", "created_at"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )
    entity_type: Mapped[str] = mapped_column(String(20), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)

    # What triggered the change: "flashcard" | "quiz" | "session"
    source_type: Mapped[str] = mapped_column(String(20), nullable=False)
    # Primary key of the triggering record (review_id, attempt_id, session_id …)
    source_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )

    old_progress_pct: Mapped[float] = mapped_column(
        Numeric(5, 2), nullable=False, default=0.0
    )
    new_progress_pct: Mapped[float] = mapped_column(
        Numeric(5, 2), nullable=False, default=0.0
    )
    # Can be negative if a correction reduces progress
    delta_progress: Mapped[float] = mapped_column(
        Numeric(6, 2), nullable=False, default=0.0
    )

    # Arbitrary context: {"score": 85, "cards_known": 7, "total_cards": 10}
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<ProgressEvent {self.entity_type}={self.entity_id} "
            f"Δ{self.delta_progress:+.2f} via {self.source_type}>"
        )
