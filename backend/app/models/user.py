from datetime import datetime
from typing import Optional, List
from xml.dom.minidom import Document
from pydantic import Tag
from sqlalchemy import ForeignKey

from app.core.db_setup import Base
from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.token import Token
from backend.app.models.study_subject import StudySubject
from backend.app.models.note import Note

class User(Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    username: Mapped[Optional[str]] = mapped_column(String, unique=True, nullable=True)
    hashed_password: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # local / google
    auth_provider: Mapped[str] = mapped_column(String, default="local", nullable=False)

    # id القادم من Google
    provider_user_id: Mapped[Optional[str]] = mapped_column(String, unique=True, nullable=True)

    first_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    profile_picture_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    timezone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    study_goal_minutes_per_day: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )
    preferred_study_time: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)

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
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
    
    def __repr__(self) -> str:
        return f"<User {self.email} ({self.full_name})>"
    
    # Relationships
    #Tokens
    tokens: Mapped[list["Token"]] = relationship(back_populates="user")
    refresh_tokens: Mapped[List["RefreshToken"]] = relationship("RefreshToken", back_populates="user")
    # core
    study_subjects: Mapped[List["StudySubject"]] = relationship("StudySubject", back_populates="user")
    tags: Mapped[List["Tag"]] = relationship("Tag", back_populates="user")
    
    # flashcards
    flashcard_decks: Mapped[List["FlashcardDeck"]] = relationship("FlashcardDeck", back_populates="user")
    flashcard_reviews: Mapped[List["FlashcardReview"]] = relationship("FlashcardReview", back_populates="user")
    
    #resources
    notes: Mapped[List["Note"]] = relationship("Note", back_populates="user")
    documents: Mapped[List["Document"]] = relationship("Document", back_populates="user")
    shared_resources: Mapped[List["SharedResource"]] = relationship("SharedResource", back_populates="shared_by_user")
    
    # study sessions
    study_sessions: Mapped[List["StudySession"]] = relationship("StudySession", back_populates="user")
    study_goals: Mapped[List["StudyGoal"]] = relationship("StudyGoal", back_populates="user")
    
    study_group_members: Mapped[List["StudyGroupMember"]] = relationship("StudyGroupMember", back_populates="user")
    created_study_groups: Mapped[List["StudyGroup"]] = relationship("StudyGroup", back_populates="creator", foreign_keys="StudyGroup.creator_id")
    
    # progress tracking
    daily_progress: Mapped[List["DailyProgress"]] = relationship("DailyProgress", back_populates="user")
    
    # AI interactions
    ai_conversations: Mapped[List["AiConversation"]] = relationship("AiConversation", back_populates="user")
    ai_generated_content: Mapped[List["AiGeneratedContent"]] = relationship("AiGeneratedContent", back_populates="user")
    ai_message_feedback: Mapped[List["AiMessageFeedback"]] = relationship("AiMessageFeedback", back_populates="user")