"""AIJob model — a structured AI generation job triggered on a workspace."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.workspace import Workspace
    from app.models.user import User
    from app.models.document import Document


# queued | running | completed | partial | failed | canceled
AI_JOB_STATUSES = {"queued", "running", "completed", "partial", "failed", "canceled"}

# summary | micro_goals | flashcards | quiz | timeline | recommendations
AI_JOB_TYPES = {"summary", "micro_goals", "flashcards", "quiz", "timeline", "recommendations"}


class AIJob(Base):
    __tablename__ = "ai_jobs"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    requested_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Optional — when the job targets a specific document (e.g. summary, flashcards from doc)
    document_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    job_type: Mapped[str] = mapped_column(String(30), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="queued", nullable=False)

    # Stores the structured output once the job completes
    result_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    workspace: Mapped["Workspace"] = relationship(
        "Workspace", back_populates="ai_jobs", lazy="noload"
    )
    requested_by: Mapped["User"] = relationship(
        "User", back_populates="ai_jobs", lazy="noload"
    )
    document: Mapped[Optional["Document"]] = relationship(
        "Document", back_populates="ai_jobs", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<AIJob type={self.job_type!r} status={self.status}>"
