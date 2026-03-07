from datetime import datetime
from typing import Optional
from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db_setup import Base


class User(Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    username: Mapped[Optional[str]] = mapped_column(String, unique=True, nullable=True)
    hashed_password: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    auth_provider: Mapped[str] = mapped_column(String, default="local", nullable=False)
    provider_user_id: Mapped[Optional[str]] = mapped_column(String, unique=True, nullable=True)

    full_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    timezone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    study_goal_minutes_per_day: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )