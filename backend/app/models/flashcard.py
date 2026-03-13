from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.flashcard_deck import FlashcardDeck
    from app.models.flashcard_reviews import FlashcardReview
    from app.models.document import Document
    from app.models.session_topic import SessionTopic


class Flashcard(Base):
    __tablename__ = "flashcards"

    deck_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("flashcard_decks.id", ondelete="CASCADE"), nullable=False, index=True
    )
    source_document_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("documents.id", ondelete="SET NULL"), nullable=True, index=True
    )
    source_topic_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("session_topics.id", ondelete="SET NULL"), nullable=True, index=True
    )

    front_content: Mapped[str] = mapped_column(String, nullable=False)
    back_content: Mapped[str] = mapped_column(String, nullable=False)
    front_content_type: Mapped[str] = mapped_column(String, nullable=False, default="text")
    back_content_type: Mapped[str] = mapped_column(String, nullable=False, default="text")
    hint: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    explanation: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    difficulty: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    card_order: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    ai_generated: Mapped[bool] = mapped_column(Boolean, default=False)

    interval_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    repetitions: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    next_review_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    total_reviews: Mapped[int] = mapped_column(Integer, default=0)
    successful_reviews: Mapped[int] = mapped_column(Integer, default=0)
    is_mastered: Mapped[bool] = mapped_column(Boolean, default=False)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    deck: Mapped["FlashcardDeck"] = relationship(
        "FlashcardDeck", back_populates="flashcards", lazy="selectin"
    )
    source_document: Mapped[Optional["Document"]] = relationship("Document", lazy="selectin")
    source_topic: Mapped[Optional["SessionTopic"]] = relationship("SessionTopic", lazy="selectin")
    reviews: Mapped[List["FlashcardReview"]] = relationship(
        "FlashcardReview", back_populates="flashcard", cascade="all, delete-orphan", lazy="noload"
    )
