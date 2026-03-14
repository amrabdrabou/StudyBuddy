"""SQLAlchemy ORM model for a collaborative study group."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.study_group_member import StudyGroupMember
    from app.models.shared_resource import SharedResource


class StudyGroup(Base):
    """
    Collaborative workspace where multiple users can share resources,
    chat, and coordinate group study sessions.
    """
    __tablename__ = "study_groups"

    # The user who created / owns the group
    creator_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    is_private: Mapped[bool] = mapped_column(Boolean, default=True)
    invite_code: Mapped[Optional[str]] = mapped_column(String, nullable=True, unique=True)
    max_members: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # many-to-one → User (creator)
    creator: Mapped["User"] = relationship(
        "User",
        back_populates="created_study_groups",
        foreign_keys=[creator_id],
        lazy="selectin",
    )

    # one-to-many → StudyGroupMember
    members: Mapped[List["StudyGroupMember"]] = relationship(
        "StudyGroupMember", back_populates="study_group", cascade="all, delete-orphan", lazy="noload"
    )

    # one-to-many → SharedResource
    shared_resources: Mapped[List["SharedResource"]] = relationship(
        "SharedResource", back_populates="study_group", cascade="all, delete-orphan", lazy="noload"
    )
