from datetime import datetime
from turtle import title
from sqlalchemy import ForeignKey, Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List
import uuid

from backend.app.core.db_setup import Base
from backend.app.models.user import User
from backend.app.models.study_subject import StudySubject

class StudyGroup(Base):
    __tablename__ = "study_group"
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    is_private: Mapped[bool] = mapped_column(Boolean, default=True)
    invite_code: Mapped[Optional[str]] = mapped_column(String, nullable=True, unique=True)
    max_members: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships many-to-many with User
    members: Mapped[List["User"]] = relationship("User", secondary="study_group_members", back_populates="study_groups")
    
    # Relationships one-to-many with StudySubject
    study_subjects: Mapped[List["StudySubject"]] = relationship("StudySubject", back_populates="study_group")