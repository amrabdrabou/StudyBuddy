from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.study_group import StudyGroup


class StudyGroupMember(Base):
    __tablename__ = "study_group_members"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    study_group_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("study_groups.id", ondelete="CASCADE"), primary_key=True
    )
    role: Mapped[str] = mapped_column(String, nullable=False, default="member")  # "owner" | "admin" | "member"
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # many-to-one → User
    user: Mapped["User"] = relationship("User", back_populates="study_group_members", lazy="selectin")

    # many-to-one → StudyGroup
    study_group: Mapped["StudyGroup"] = relationship(
        "StudyGroup", back_populates="members", lazy="selectin"
    )
