from datetime import datetime
from typing import Optional

from app.core.db_setup import Base
from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.token import Token


class User(Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    username: Mapped[Optional[str]] = mapped_column(String, unique=True, nullable=True)

    # nullable لأن مستخدم Google ممكن ما يكونش عنده باسورد محلي
    hashed_password: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # local / google
    auth_provider: Mapped[str] = mapped_column(String, default="local", nullable=False)

    # id القادم من Google
    provider_user_id: Mapped[Optional[str]] = mapped_column(String, unique=True, nullable=True)

    first_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    timezone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    study_goal_minutes_per_day: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    tokens: Mapped[list["Token"]] = relationship(back_populates="user")
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)

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
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
    
    def __repr__(self) -> str:
        return f"<User {self.email} ({self.full_name})>"