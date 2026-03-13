# Import order matters: leaf models before models that reference them.
# All classes must be imported here so SQLAlchemy's mapper can resolve
# string-based forward references used in relationship() calls.

from app.models.user import User  # noqa: F401
from app.models.token import Token  # noqa: F401
from app.models.tag import Tag  # noqa: F401
from app.models.study_subject import StudySubject  # noqa: F401
from app.models.note import Note  # noqa: F401
from app.models.note_tag import NoteTag  # noqa: F401
from app.models.document import Document  # noqa: F401
from app.models.document_tag import DocumentTag  # noqa: F401
from app.models.document_topic import DocumentTopic  # noqa: F401
from app.models.flashcard_deck import FlashcardDeck  # noqa: F401
from app.models.flashcard import Flashcard  # noqa: F401
from app.models.study_session import StudySession  # noqa: F401
from app.models.flashcard_reviews import FlashcardReview  # noqa: F401
from app.models.study_goal import StudyGoal  # noqa: F401
from app.models.study_group import StudyGroup  # noqa: F401
from app.models.study_group_member import StudyGroupMember  # noqa: F401
from app.models.shared_resource import SharedResource  # noqa: F401
from app.models.session_participant import SessionParticipant  # noqa: F401
from app.models.session_document import SessionDocument  # noqa: F401
from app.models.session_topic import SessionTopic  # noqa: F401
from app.models.micro_goal import MicroGoal  # noqa: F401
from app.models.session_ai_event import SessionAiEvent  # noqa: F401
from app.models.quiz_question import QuizQuestion  # noqa: F401
from app.models.quiz_attempt import QuizAttempt  # noqa: F401
from app.models.session_reflection import SessionReflection  # noqa: F401
from app.models.session_recommendation import SessionRecommendation  # noqa: F401

__all__ = [
    "User",
    "Token",
    "Tag",
    "StudySubject",
    "Note",
    "NoteTag",
    "Document",
    "DocumentTag",
    "DocumentTopic",
    "FlashcardDeck",
    "Flashcard",
    "StudySession",
    "FlashcardReview",
    "StudyGoal",
    "StudyGroup",
    "StudyGroupMember",
    "SharedResource",
    "SessionParticipant",
    "SessionDocument",
    "SessionTopic",
    "MicroGoal",
    "SessionAiEvent",
    "QuizQuestion",
    "QuizAttempt",
    "SessionReflection",
    "SessionRecommendation",
]
