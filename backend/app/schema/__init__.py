from app.schema.auth import TokenOut
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
from app.schema.session_participant import (
    SessionParticipantBase,
    SessionParticipantCreate,
    SessionParticipantUpdate,
    SessionParticipantResponse,
)
from app.schema.session_document import (
    SessionDocumentCreate,
    SessionDocumentResponse,
)
from app.schema.document_topic import (
    DocumentTopicBase,
    DocumentTopicCreate,
    DocumentTopicUpdate,
    DocumentTopicResponse,
)
from app.schema.session_topic import (
    SessionTopicBase,
    SessionTopicCreate,
    SessionTopicUpdate,
    SessionTopicResponse,
)
from app.schema.micro_goal import (
    MicroGoalBase,
    MicroGoalCreate,
    MicroGoalUpdate,
    MicroGoalResponse,
)
from app.schema.session_ai_event import (
    SessionAiEventBase,
    SessionAiEventCreate,
    SessionAiEventUpdate,
    SessionAiEventResponse,
)
from app.schema.quiz_question import (
    QuizQuestionBase,
    QuizQuestionCreate,
    QuizQuestionUpdate,
    QuizQuestionResponse,
)
from app.schema.quiz_attempt import (
    QuizAttemptCreate,
    QuizAttemptResponse,
)
from app.schema.session_reflection import (
    SessionReflectionBase,
    SessionReflectionCreate,
    SessionReflectionUpdate,
    SessionReflectionResponse,
)
from app.schema.session_recommendation import (
    SessionRecommendationBase,
    SessionRecommendationCreate,
    SessionRecommendationUpdate,
    SessionRecommendationResponse,
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
    # SessionParticipant
    "SessionParticipantBase", "SessionParticipantCreate", "SessionParticipantUpdate", "SessionParticipantResponse",
    # SessionDocument
    "SessionDocumentCreate", "SessionDocumentResponse",
    # DocumentTopic
    "DocumentTopicBase", "DocumentTopicCreate", "DocumentTopicUpdate", "DocumentTopicResponse",
    # SessionTopic
    "SessionTopicBase", "SessionTopicCreate", "SessionTopicUpdate", "SessionTopicResponse",
    # MicroGoal
    "MicroGoalBase", "MicroGoalCreate", "MicroGoalUpdate", "MicroGoalResponse",
    # SessionAiEvent
    "SessionAiEventBase", "SessionAiEventCreate", "SessionAiEventUpdate", "SessionAiEventResponse",
    # QuizQuestion
    "QuizQuestionBase", "QuizQuestionCreate", "QuizQuestionUpdate", "QuizQuestionResponse",
    # QuizAttempt
    "QuizAttemptCreate", "QuizAttemptResponse",
    # SessionReflection
    "SessionReflectionBase", "SessionReflectionCreate", "SessionReflectionUpdate", "SessionReflectionResponse",
    # SessionRecommendation
    "SessionRecommendationBase", "SessionRecommendationCreate", "SessionRecommendationUpdate", "SessionRecommendationResponse",
]
