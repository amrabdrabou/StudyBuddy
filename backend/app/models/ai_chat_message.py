"""AIChatMessage model — a single message in a workspace's persistent AI conversation."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.workspace import Workspace
    from app.models.user import User


# user | assistant
CHAT_ROLES = {"user", "assistant"}


class AIChatMessage(Base):
    __tablename__ = "ai_chat_messages"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(String(10), nullable=False)  # user | assistant
    content: Mapped[str] = mapped_column(Text, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    workspace: Mapped["Workspace"] = relationship(
        "Workspace", back_populates="ai_chat_messages", lazy="noload"
    )
    user: Mapped["User"] = relationship(
        "User", back_populates="ai_chat_messages", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<AIChatMessage role={self.role!r} workspace={self.workspace_id}>"
