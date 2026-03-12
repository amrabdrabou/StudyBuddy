# Import order matters: leaf models before models that reference them.
# All classes must be imported here so SQLAlchemy's mapper can resolve
# string-based forward references used in relationship() calls.

from app.models.associations import user_tags  # noqa: F401 — registers table in metadata

from app.models.user import User  # noqa: F401
from app.models.token import Token  # noqa: F401
from app.models.tag import Tag  # noqa: F401
from app.models.study_subject import StudySubject  # noqa: F401
from app.models.note import Note  # noqa: F401
from app.models.note_tag import NoteTag  # noqa: F401
from app.models.document import Document  # noqa: F401
from app.models.document_tag import DocumentTag  # noqa: F401
from app.models.flashcard_deck import FlashcardDeck  # noqa: F401
from app.models.flashcard import Flashcard  # noqa: F401
from app.models.study_session import StudySession  # noqa: F401
from app.models.flashcard_reviews import FlashcardReview  # noqa: F401
from app.models.study_goal import StudyGoal  # noqa: F401
from app.models.study_group import StudyGroup  # noqa: F401
from app.models.study_group_member import StudyGroupMember  # noqa: F401
from app.models.shared_resource import SharedResource  # noqa: F401

__all__ = [
    "user_tags",
    "User",
    "Token",
    "Tag",
    "StudySubject",
    "Note",
    "NoteTag",
    "Document",
    "DocumentTag",
    "FlashcardDeck",
    "Flashcard",
    "StudySession",
    "FlashcardReview",
    "StudyGoal",
    "StudyGroup",
    "StudyGroupMember",
    "SharedResource",
]
