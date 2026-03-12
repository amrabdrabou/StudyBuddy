from datetime import datetime
from turtle import title
from sqlalchemy import ForeignKey, Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List
import uuid

from backend.app.core.db_setup import Base
from backend.app.models.user import User
from backend.app.models.study_subject import StudySubject

class StudyGoal(Base):
    __tablename__ = "study_goals"
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    study_subject_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("study_subjects.id"), nullable=True
    )
    goal_type: Mapped[str] = mapped_column(String, nullable=False)
    target_value: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    current_value: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    start_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    end_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
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

    # Relationships many-to-one with User
    user: Mapped["User"] = relationship("User", back_populates="study_goals")
    
    # Relationships many-to-one with StudySubject
    study_subject: Mapped[Optional["StudySubject"]] = relationship("StudySubject", back_populates="study_goals")