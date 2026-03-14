"""SQLAlchemy ORM model linking users to their study groups with role information."""
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
    """
    Association table linking Users to Study Groups.
    Manages membership lifecycles and permission roles within the group.
    """
    __tablename__ = "study_group_members"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    study_group_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("study_groups.id", ondelete="CASCADE"), primary_key=True
    )
    
    # Permission level inside the group: "owner" | "admin" | "member"
    role: Mapped[str] = mapped_column(String, nullable=False, default="member")
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # many-to-one → User
    user: Mapped["User"] = relationship("User", back_populates="study_group_members", lazy="selectin")

    # many-to-one → StudyGroup
    study_group: Mapped["StudyGroup"] = relationship(
        "StudyGroup", back_populates="members", lazy="selectin"
    )
