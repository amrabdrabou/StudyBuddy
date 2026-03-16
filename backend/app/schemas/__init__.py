from app.schemas.auth import TokenOut
from app.schemas.user import UserBase, UserCreate, UserUpdate, UserResponse
from app.schemas.token import TokenBase, TokenCreate, TokenUpdate, TokenResponse
from app.schemas.tag import TagBase, TagCreate, TagUpdate, TagResponse
from app.schemas.study_subject import (
    StudySubjectBase,
    StudySubjectCreate,
    StudySubjectUpdate,
    StudySubjectResponse,
)
from app.schemas.note import NoteBase, NoteCreate, NoteUpdate, NoteResponse, NoteTagResponse
from app.schemas.document import (
    DocumentBase,
    DocumentCreate,
    DocumentUpdate,
    DocumentResponse,
    DocumentTagResponse,
)
from app.schemas.flashcard import (
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
from app.schemas.learning_goal import (
    LearningGoalBase,
    LearningGoalCreate,
    LearningGoalUpdate,
    LearningGoalResponse,
)
from app.schemas.study_session import (
    StudySessionBase,
    StudySessionCreate,
    StudySessionUpdate,
    StudySessionResponse,
)
from app.schemas.session_participant import (
    SessionParticipantBase,
    SessionParticipantCreate,
    SessionParticipantUpdate,
    SessionParticipantResponse,
)
from app.schemas.session_document import (
    SessionDocumentCreate,
    SessionDocumentResponse,
)
from app.schemas.document_topic import (
    DocumentTopicBase,
    DocumentTopicCreate,
    DocumentTopicUpdate,
    DocumentTopicResponse,
)
from app.schemas.session_topic import (
    SessionTopicBase,
    SessionTopicCreate,
    SessionTopicUpdate,
    SessionTopicResponse,
)
from app.schemas.micro_goal import (
    MicroGoalBase,
    MicroGoalCreate,
    MicroGoalUpdate,
    MicroGoalResponse,
)
from app.schemas.session_ai_event import (
    SessionAiEventBase,
    SessionAiEventCreate,
    SessionAiEventUpdate,
    SessionAiEventResponse,
)
from app.schemas.quiz_set import (
    QuizSetBase,
    QuizSetCreate,
    QuizSetUpdate,
    QuizSetResponse,
)
from app.schemas.quiz_option import (
    QuizOptionCreate,
    QuizOptionUpdate,
    QuizOptionResponse,
)
from app.schemas.quiz_question import (
    QuizQuestionBase,
    QuizQuestionCreate,
    QuizQuestionUpdate,
    QuizQuestionResponse,
)
from app.schemas.quiz_attempt import (
    QuizAttemptCreate,
    QuizAttemptUpdate,
    QuizAttemptResponse,
)
from app.schemas.quiz_attempt_answer import (
    QuizAttemptAnswerCreate,
    QuizAttemptAnswerResponse,
)
from app.schemas.session_reflection import (
    SessionReflectionBase,
    SessionReflectionCreate,
    SessionReflectionUpdate,
    SessionReflectionResponse,
)
from app.schemas.session_recommendation import (
    SessionRecommendationBase,
    SessionRecommendationCreate,
    SessionRecommendationUpdate,
    SessionRecommendationResponse,
)
from app.schemas.study_group import (
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
from app.schemas.timeline_event import (
    TimelineEventCreate,
    TimelineEventResponse,
)
from app.schemas.ai_recommendation import (
    AiRecommendationCreate,
    AiRecommendationUpdate,
    AiRecommendationResponse,
)
from app.schemas.progress_snapshot import (
    ProgressSnapshotCreate,
    ProgressSnapshotResponse,
)

__all__ = [
    # Auth
    "TokenOut",
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
    # LearningGoal
    "LearningGoalBase", "LearningGoalCreate", "LearningGoalUpdate", "LearningGoalResponse",
    # StudySession
    "StudySessionBase", "StudySessionCreate", "StudySessionUpdate", "StudySessionResponse",
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
    # QuizSet
    "QuizSetBase", "QuizSetCreate", "QuizSetUpdate", "QuizSetResponse",
    # QuizOption
    "QuizOptionCreate", "QuizOptionUpdate", "QuizOptionResponse",
    # QuizQuestion
    "QuizQuestionBase", "QuizQuestionCreate", "QuizQuestionUpdate", "QuizQuestionResponse",
    # QuizAttempt
    "QuizAttemptCreate", "QuizAttemptUpdate", "QuizAttemptResponse",
    # QuizAttemptAnswer
    "QuizAttemptAnswerCreate", "QuizAttemptAnswerResponse",
    # SessionReflection
    "SessionReflectionBase", "SessionReflectionCreate", "SessionReflectionUpdate", "SessionReflectionResponse",
    # SessionRecommendation
    "SessionRecommendationBase", "SessionRecommendationCreate", "SessionRecommendationUpdate", "SessionRecommendationResponse",
    # Timeline
    "TimelineEventCreate", "TimelineEventResponse",
    # AiRecommendation
    "AiRecommendationCreate", "AiRecommendationUpdate", "AiRecommendationResponse",
    # ProgressSnapshot
    "ProgressSnapshotCreate", "ProgressSnapshotResponse",
]
