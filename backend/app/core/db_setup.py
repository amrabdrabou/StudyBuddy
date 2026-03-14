"""Database engine and session setup for async SQLAlchemy connections."""
import uuid
from typing import AsyncGenerator

from app.core.config import get_settings
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

settings = get_settings()

# Create the foundational async engine for database interactions
# 'echo' enables SQL query logging when in debug mode
engine = create_async_engine(settings.database_url, echo=settings.debug)

# Factory for generating new async database sessions for each request
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False, # Keeps the session valid after a commit so objects remain accessible
)


class Base(DeclarativeBase):
    """
    Abstract base class for all SQLAlchemy ORM models.
    Provides a standard UUID-based primary key for all inherited tables.
    """
    __abstract__ = True
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that provides a transactional scope around database operations.
    Yields an active database session and ensures it's closed when the request finishes.
    """
    async with AsyncSessionLocal() as session:
        yield session
