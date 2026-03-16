"""SQLAlchemy ORM model for persisted access tokens."""
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
    Represents a persisted access token for a user session.

    Security design:
    - `token` stores the SHA-256 hash of the raw token, never the plaintext.
    - Only the raw token is returned to the client at login time.
    - On every authenticated request the incoming raw token is hashed and
      looked up, so a database breach exposes no usable credentials.
    """
    __tablename__ = "tokens"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # SHA-256 hash of the raw token string (hex digest, 64 chars)
    token: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)

    # "access" or "refresh"
    token_type: Mapped[str] = mapped_column(String(10), nullable=False, server_default="access")

    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="tokens", lazy="selectin")
