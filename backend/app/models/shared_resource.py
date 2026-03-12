from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.study_group import StudyGroup


class SharedResource(Base):
    __tablename__ = "shared_resources"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    study_group_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("study_group.id", ondelete="CASCADE"), nullable=False, index=True
    )
    resource_type: Mapped[str] = mapped_column(String, nullable=False)  # "document" | "note" | "deck"
    resource_id: Mapped[uuid.UUID] = mapped_column(String, nullable=False)
    title: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    shared_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # many-to-one → User (the person who shared)
    shared_by_user: Mapped["User"] = relationship(
        "User", back_populates="shared_resources", lazy="selectin"
    )

    # many-to-one → StudyGroup
    study_group: Mapped["StudyGroup"] = relationship(
        "StudyGroup", back_populates="shared_resources", lazy="selectin"
    )
