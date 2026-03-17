"""Schema registry — new architecture."""
from app.schemas.auth import TokenOut  # noqa: F401
from app.schemas.token import TokenBase, TokenCreate, TokenResponse  # noqa: F401
from app.schemas.user import UserCreate, UserUpdate, UserResponse  # noqa: F401
from app.schemas.subject import SubjectCreate, SubjectUpdate, SubjectResponse  # noqa: F401
from app.schemas.big_goal import BigGoalCreate, BigGoalUpdate, BigGoalResponse  # noqa: F401
from app.schemas.workspace import WorkspaceCreate, WorkspaceUpdate, WorkspaceResponse  # noqa: F401
from app.schemas.document import DocumentResponse  # noqa: F401
