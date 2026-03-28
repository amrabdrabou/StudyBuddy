"""PipelineRun — tracks each step of the AI/system generation pipeline per document.

Used for:
- Idempotency: skip tasks already completed
- Observability: see timings, errors, retries per task
- Retry logic: re-run failed tasks
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db_setup import Base


class PipelineRun(Base):
    __tablename__ = "pipeline_runs"

    id: Mapped[uuid.UUID] = mapped_column(default=uuid.uuid4, primary_key=True)

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), index=True, nullable=False
    )
    # NULL means the task applies to the whole workspace (e.g. micro_goals, progress)
    document_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), index=True, nullable=True
    )

    # e.g. "summarize", "flashcards", "quiz", "micro_goals", "progress"
    task_name: Mapped[str] = mapped_column(String(64), nullable=False)

    # pending | running | completed | failed | skipped
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)

    # Source event that triggered this run
    triggered_by: Mapped[str] = mapped_column(String(64), default="unknown", nullable=False)

    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    started_at: Mapped[datetime | None] = mapped_column(nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc), nullable=False
    )

    __table_args__ = (
        # One authoritative run per (workspace, document, task) — updated on retry
        UniqueConstraint("workspace_id", "document_id", "task_name", name="uq_pipeline_run"),
    )
