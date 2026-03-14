"""SQLAlchemy ORM model for persisted refresh/access tokens."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.user import User


class Token(Base):
    """
    Represents a persistent refresh or access token for a user.
    Used for managing active user sessions.
    """
    __tablename__ = "tokens"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # The actual token string (usually hashed before storage)
    token: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    
    # Absolute timestamp after which the token is invalid
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # many-to-one → User
    user: Mapped["User"] = relationship("User", back_populates="tokens", lazy="selectin")
