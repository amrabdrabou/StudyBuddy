"""FlashcardReview model — one SRS review event for a flashcard inside a session."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, SmallInteger, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.flashcard import Flashcard
    from app.models.session import Session


class FlashcardReview(Base):
    __tablename__ = "flashcard_reviews"

    flashcard_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("flashcards.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sessions.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # SM-2 quality rating: 0=Blackout … 5=Perfect
    quality_rating: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    next_review_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    total_reviews: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    correct_reviews: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    reviewed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    flashcard: Mapped["Flashcard"] = relationship(
        "Flashcard", back_populates="reviews", lazy="noload"
    )
    session: Mapped[Optional["Session"]] = relationship(
        "Session", back_populates="flashcard_reviews", lazy="noload"
    )
