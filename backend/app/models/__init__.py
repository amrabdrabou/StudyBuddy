"""
SQLAlchemy ORM model registry.
Import order matters: leaf models (with no dependencies) before models that reference them.
All classes must be imported here so SQLAlchemy's mapper can resolve
string-based forward references used in relationship() calls.
"""
# ── Auth & Users ──────────────────────────────────────────────────────────────
from app.models.user import User  # noqa: F401
from app.models.token import Token  # noqa: F401
from app.models.tag import Tag  # noqa: F401

# ── Organization ──────────────────────────────────────────────────────────────
from app.models.study_subject import StudySubject  # noqa: F401
from app.models.learning_goal import LearningGoal  # noqa: F401

# ── Notes ─────────────────────────────────────────────────────────────────────
from app.models.note import Note  # noqa: F401
from app.models.note_tag import NoteTag  # noqa: F401

# ── Documents ─────────────────────────────────────────────────────────────────
from app.models.document import Document  # noqa: F401
from app.models.document_tag import DocumentTag  # noqa: F401
from app.models.document_topic import DocumentTopic  # noqa: F401
from app.models.document_content import DocumentContent  # noqa: F401
from app.models.document_chunk import DocumentChunk  # noqa: F401

# ── Flashcards ────────────────────────────────────────────────────────────────
from app.models.flashcard_deck import FlashcardDeck  # noqa: F401
from app.models.flashcard import Flashcard  # noqa: F401

# ── Sessions ──────────────────────────────────────────────────────────────────
from app.models.study_session import StudySession  # noqa: F401  (needs LearningGoal)
from app.models.flashcard_reviews import FlashcardReview  # noqa: F401
from app.models.timeline_event import TimelineEvent  # noqa: F401

# ── Groups & Sharing ──────────────────────────────────────────────────────────
from app.models.study_group import StudyGroup  # noqa: F401
from app.models.study_group_member import StudyGroupMember  # noqa: F401
from app.models.shared_resource import SharedResource  # noqa: F401

# ── Session sub-tables ────────────────────────────────────────────────────────
from app.models.session_participant import SessionParticipant  # noqa: F401
from app.models.session_document import SessionDocument  # noqa: F401
from app.models.session_topic import SessionTopic  # noqa: F401
from app.models.micro_goal import MicroGoal  # noqa: F401
from app.models.session_ai_event import SessionAiEvent  # noqa: F401
from app.models.session_reflection import SessionReflection  # noqa: F401
from app.models.session_recommendation import SessionRecommendation  # noqa: F401

# ── Quizzes ───────────────────────────────────────────────────────────────────
from app.models.quiz_set import QuizSet  # noqa: F401
from app.models.quiz_question import QuizQuestion  # noqa: F401
from app.models.quiz_option import QuizOption  # noqa: F401
from app.models.quiz_attempt import QuizAttempt  # noqa: F401
from app.models.quiz_attempt_answer import QuizAttemptAnswer  # noqa: F401

# ── AI Layer ──────────────────────────────────────────────────────────────────
from app.models.ai_suggestion import AiSuggestion  # noqa: F401
from app.models.ai_recommendation import AiRecommendation  # noqa: F401

# ── Dashboard ─────────────────────────────────────────────────────────────────
from app.models.progress_snapshot import ProgressSnapshot  # noqa: F401

__all__ = [
    "User", "Token", "Tag",
    "StudySubject", "LearningGoal",
    "Note", "NoteTag",
    "Document", "DocumentTag", "DocumentTopic", "DocumentContent", "DocumentChunk",
    "FlashcardDeck", "Flashcard", "FlashcardReview",
    "StudySession", "TimelineEvent",
    "StudyGroup", "StudyGroupMember", "SharedResource",
    "SessionParticipant", "SessionDocument", "SessionTopic",
    "MicroGoal", "SessionAiEvent", "SessionReflection", "SessionRecommendation",
    "QuizSet", "QuizQuestion", "QuizOption", "QuizAttempt", "QuizAttemptAnswer",
    "AiSuggestion", "AiRecommendation",
    "ProgressSnapshot",
]
