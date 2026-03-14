"""SQLAlchemy ORM model for chronological events shown on a user's study timeline."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.study_session import StudySession


class TimelineEvent(Base):
    """
    Immutable, append-only activity feed representing a user's entire learning journey.
    Every significant state change in the system (e.g., starting a session, finishing a quiz)
    writes one row here. Used to render the main dashboard's "History" or "Timeline" view.

    event_type values (non-exhaustive):
        session_created | session_started | session_paused | session_completed | session_abandoned
        document_uploaded | text_extracted | topics_detected
        goal_suggested | goal_accepted | goal_rejected | goal_completed
        micro_goal_created | micro_goal_completed | micro_goal_skipped
        quiz_generated | quiz_started | quiz_completed
        flashcards_generated | flashcard_reviewed
        progress_updated | milestone_reached
        member_joined | member_left | role_changed
        ai_recommendation_created
        note_created | note_updated
    """
    __tablename__ = "timeline_events"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # The session during which this event occurred (if applicable)
    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("study_sessions.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Polymorphic reference to the exact entity this event is about
    # entity_type: session | document | goal | micro_goal | quiz_set |
    #              quiz_attempt | flashcard_deck | ai_suggestion | participant | learning_goal
    entity_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    entity_id: Mapped[Optional[uuid.UUID]] = mapped_column(nullable=True)

    # Identifying string to map to a UI icon/color (e.g., "quiz_completed")
    event_type: Mapped[str] = mapped_column(String, nullable=False)
    
    # Human-readable fallback text (e.g., "Scored 90% on Biology Quiz")
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    # Flexible extra data (JSON string) for rich frontend rendering (e.g., {"score": 90, "total": 100})
    metadata_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Flags if this action was performed autonomously by the AI agent on behalf of the user
    is_ai_generated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    
    # Visibility: False = private (only owner sees it); True = visible to session/group collaborators
    is_public: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    user: Mapped["User"] = relationship(
        "User", back_populates="timeline_events", lazy="selectin"
    )
    session: Mapped[Optional["StudySession"]] = relationship(
        "StudySession", back_populates="timeline_events", lazy="selectin"
    )
