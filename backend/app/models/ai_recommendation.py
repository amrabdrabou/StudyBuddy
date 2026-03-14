"""SQLAlchemy ORM model for AI-generated study recommendations at the user level."""
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
    from app.models.learning_goal import LearningGoal


class AiRecommendation(Base):
    """
    Dashboard-level AI recommendations — broader than session-scoped events.
    Examples: 'Start a new session', 'Review flashcards due today', 'You're behind pace'.
    These act as actionable insights nudging the user to study or review.
    """
    __tablename__ = "ai_recommendations"

    # The user receiving this recommendation
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Optional context tying the recommendation to a specific study session
    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("study_sessions.id", ondelete="SET NULL"), nullable=True
    )
    # Optional context tying the recommendation to a broader learning goal
    learning_goal_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("learning_goals.id", ondelete="SET NULL"), nullable=True
    )

    # Classifies the intent: next_session | review_reminder | pace_warning | topic_suggestion | break_suggestion
    recommendation_type: Mapped[str] = mapped_column(String, nullable=False)
    
    # User-facing summary (e.g., "Ready for a review?")
    title: Mapped[str] = mapped_column(String, nullable=False)
    
    # Detailed explanation of why this was recommended
    body: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Optional deep link to direct the user to the relevant page (e.g., /flashcards/deck-id)
    action_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # Tracks if the user intentionally dismissed the recommendation to clear it from their dashboard
    is_dismissed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    
    # Auto-expiration for time-sensitive nudges (like a break suggestion that becomes irrelevant later)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship(
        "User", back_populates="ai_recommendations", lazy="selectin"
    )
    session: Mapped[Optional["StudySession"]] = relationship("StudySession", lazy="selectin")
    learning_goal: Mapped[Optional["LearningGoal"]] = relationship(
        "LearningGoal", back_populates="recommendations", lazy="selectin"
    )
