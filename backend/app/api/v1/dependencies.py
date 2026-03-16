"""FastAPI dependency functions for authentication and database session injection."""
from datetime import datetime, timezone

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db_setup import get_db
from app.core.security import hash_token, oauth2_scheme
from app.models.token import Token
from app.models.user import User

_credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid or expired token",
    headers={"WWW-Authenticate": "Bearer"},
)


async def get_current_user(
    raw_token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Validate the Bearer token and return the associated User.

    Tokens are stored as SHA-256 hashes in the DB.
    We hash the incoming raw token before looking it up — the plaintext
    never touches the database, so a DB breach does not expose live tokens.
    """
    hashed = hash_token(raw_token)
    result = await db.execute(select(Token).where(Token.token == hashed))
    db_token = result.scalar_one_or_none()

    if db_token is None:
        raise _credentials_exception

    if db_token.expires_at < datetime.now(timezone.utc):
        await db.delete(db_token)
        await db.commit()
        raise _credentials_exception

    return db_token.user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )
    return current_user
