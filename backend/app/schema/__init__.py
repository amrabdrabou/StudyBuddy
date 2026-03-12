from app.schema.auth import JWTToken
from app.schema.user import UserBase, UserCreate, UserUpdate, UserResponse
from app.schema.token import TokenBase, TokenCreate, TokenUpdate, TokenResponse
from app.schema.tag import TagBase, TagCreate, TagUpdate, TagResponse
from app.schema.study_subject import (
    StudySubjectBase,
    StudySubjectCreate,
    StudySubjectUpdate,
    StudySubjectResponse,
)
from app.schema.note import NoteBase, NoteCreate, NoteUpdate, NoteResponse, NoteTagResponse
from app.schema.document import (
    DocumentBase,
    DocumentCreate,
    DocumentUpdate,
    DocumentResponse,
    DocumentTagResponse,
)
from app.schema.flashcard import (
    FlashcardDeckBase,
    FlashcardDeckCreate,
    FlashcardDeckUpdate,
    FlashcardDeckResponse,
    FlashcardBase,
    FlashcardCreate,
    FlashcardUpdate,
    FlashcardResponse,
    FlashcardReviewBase,
    FlashcardReviewCreate,
    FlashcardReviewUpdate,
    FlashcardReviewResponse,
)
from app.schema.study_session import (
    StudySessionBase,
    StudySessionCreate,
    StudySessionUpdate,
    StudySessionResponse,
)
from app.schema.study_goal import (
    StudyGoalBase,
    StudyGoalCreate,
    StudyGoalUpdate,
    StudyGoalResponse,
)
from app.schema.study_group import (
    StudyGroupBase,
    StudyGroupCreate,
    StudyGroupUpdate,
    StudyGroupResponse,
    StudyGroupMemberResponse,
    SharedResourceBase,
    SharedResourceCreate,
    SharedResourceUpdate,
    SharedResourceResponse,
)

__all__ = [
    # User
    "UserBase", "UserCreate", "UserUpdate", "UserResponse",
    # Token
    "TokenBase", "TokenCreate", "TokenUpdate", "TokenResponse",
    # Tag
    "TagBase", "TagCreate", "TagUpdate", "TagResponse",
    # StudySubject
    "StudySubjectBase", "StudySubjectCreate", "StudySubjectUpdate", "StudySubjectResponse",
    # Note
    "NoteBase", "NoteCreate", "NoteUpdate", "NoteResponse", "NoteTagResponse",
    # Document
    "DocumentBase", "DocumentCreate", "DocumentUpdate", "DocumentResponse", "DocumentTagResponse",
    # Flashcard
    "FlashcardDeckBase", "FlashcardDeckCreate", "FlashcardDeckUpdate", "FlashcardDeckResponse",
    "FlashcardBase", "FlashcardCreate", "FlashcardUpdate", "FlashcardResponse",
    "FlashcardReviewBase", "FlashcardReviewCreate", "FlashcardReviewUpdate", "FlashcardReviewResponse",
    # StudySession
    "StudySessionBase", "StudySessionCreate", "StudySessionUpdate", "StudySessionResponse",
    # StudyGoal
    "StudyGoalBase", "StudyGoalCreate", "StudyGoalUpdate", "StudyGoalResponse",
    # StudyGroup
    "StudyGroupBase", "StudyGroupCreate", "StudyGroupUpdate", "StudyGroupResponse",
    "StudyGroupMemberResponse",
    # SharedResource
    "SharedResourceBase", "SharedResourceCreate", "SharedResourceUpdate", "SharedResourceResponse",
]
