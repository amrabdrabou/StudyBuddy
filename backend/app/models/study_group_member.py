import uuid
from datetime import datetime
from turtle import title
from typing import List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.core.db_setup import Base
from backend.app.models.study_group import StudyGroup
from backend.app.models.user import User


class SharedResource(Base):
    __tablename__ = "shared_resources"
    study_group_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("study_group.id"), nullable=False
    )
    resource_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("documents.id"), nullable=False
    )
    role: Mapped[str] = mapped_column(String, nullable=False)  # e.g., "editor", "viewer"
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships many-to-one with User
    user: Mapped["User"] = relationship("User", back_populates="shared_resources")

    # Relationships many-to-one with StudyGroup
    study_group: Mapped["StudyGroup"] = relationship(
        "StudyGroup", back_populates="shared_resources"
    )
