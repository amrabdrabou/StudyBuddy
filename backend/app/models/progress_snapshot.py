"""ProgressSnapshot — denormalised progress cache per user × entity.

One row per (user_id, entity_type, entity_id).  Rows are upserted by the
progress_service whenever progress changes; never written from routers directly.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Index, Numeric, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db_setup import Base

# Valid entity types for progress tracking
PROGRESS_ENTITY_TYPES = {"session", "micro_goal", "workspace", "subject", "mission"}


class ProgressSnapshot(Base):
    """Cached progress percentage for a single user × entity combination."""

    __tablename__ = "progress_snapshots"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "entity_type", "entity_id",
            name="uq_progress_snapshot_user_entity",
        ),
        Index("ix_progress_snapshots_lookup", "user_id", "entity_type", "entity_id"),
        Index("ix_progress_snapshots_entity", "entity_type", "entity_id"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )
    entity_type: Mapped[str] = mapped_column(String(20), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)

    # 0.00 – 100.00
    progress_pct: Mapped[float] = mapped_column(
        Numeric(5, 2), nullable=False, default=0.0
    )
    # Breakdown stored for cheap front-end consumption
    # e.g. {"fc_pct": 80, "quiz_pct": 70, "session_count": 3}
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    computed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<ProgressSnapshot {self.entity_type}={self.entity_id} "
            f"user={self.user_id} pct={self.progress_pct}>"
        )
