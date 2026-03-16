"""API router handling user registration, login, logout, and token refresh."""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.core.config import get_settings
from app.core.db_setup import get_db
from app.core.security import (
    generate_token,
    hash_password,
    hash_token,
    access_token_expiry,
    refresh_token_expiry,
    verify_password,
)
from app.core.limiter import limiter
from app.models.token import Token
from app.models.user import User
from app.schemas.auth import TokenOut, RefreshOut
from app.schemas.user import UserCreate, UserResponse

router = APIRouter(prefix="/auth", tags=["Auth"])
logger = logging.getLogger(__name__)

settings = get_settings()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_username(email: str) -> str:
    return email.split("@")[0].strip().lower().replace(" ", "")[:30] or "user"


async def _unique_username(db: AsyncSession, email: str) -> str:
    base = _make_username(email)
    candidate = base
    counter = 1
    while True:
        taken = await db.execute(select(User).where(User.username == candidate))
        if taken.scalar_one_or_none() is None:
            return candidate
        counter += 1
        candidate = f"{base}{counter}"[:40]


def _token_out(raw_access: str) -> TokenOut:
    return TokenOut(
        access_token=raw_access,
        expires_in=settings.access_token_expire_minutes * 60,
    )


# ── Register ──────────────────────────────────────────────────────────────────

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.register_rate_limit)
async def register(request: Request, payload: UserCreate, db: AsyncSession = Depends(get_db)):
    """
    Create a new local account.
    Rate-limited to prevent mass account creation / enumeration attacks.
    """
    result = await db.execute(
        select(User).where(
            or_(User.email == payload.email, User.username == payload.username)
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        # Return the same 409 regardless of which field collides — avoids enumeration
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Credentials already in use")

    user = User(
        email=payload.email,
        username=payload.username,
        first_name=payload.first_name,
        last_name=payload.last_name,
        timezone=payload.timezone,
        study_goal_minutes_per_day=payload.study_goal_minutes_per_day,
        hashed_password=hash_password(payload.password),
        auth_provider="local",
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    logger.info("REGISTER user_id=%s email=%s", user.id, user.email)
    return user


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenOut)
@limiter.limit(settings.login_rate_limit)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """
    Exchange credentials for an access token.
    Rate-limited to 5 attempts/minute per IP to prevent brute-force attacks.
    Tokens are stored hashed; only the raw token is returned to the client.
    """
    result = await db.execute(
        select(User).where(
            or_(User.email == form_data.username, User.username == form_data.username)
        )
    )
    user = result.scalar_one_or_none()

    # Identical error for "not found" and "wrong password" — prevents account enumeration
    if user is None or user.hashed_password is None or not verify_password(form_data.password, user.hashed_password):
        logger.warning(
            "LOGIN_FAILURE identifier=%s ip=%s",
            form_data.username,
            request.client.host if request.client else "unknown",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")

    # Generate raw token → return to client; store only the hash in DB
    raw_token = generate_token()
    db_token = Token(
        user_id=user.id,
        token=hash_token(raw_token),
        expires_at=access_token_expiry(),
        token_type="access",
    )
    db.add(db_token)
    await db.commit()

    logger.info(
        "LOGIN_SUCCESS user_id=%s ip=%s",
        user.id,
        request.client.host if request.client else "unknown",
    )
    return _token_out(raw_token)


# ── Logout ────────────────────────────────────────────────────────────────────

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Invalidate the current access token immediately.
    Deletes the hashed token from the DB so it cannot be reused.
    """
    # Pull the raw token from the Authorization header
    auth_header = request.headers.get("Authorization", "")
    raw_token = auth_header.removeprefix("Bearer ").strip()

    if raw_token:
        await db.execute(
            delete(Token).where(
                Token.user_id == current_user.id,
                Token.token == hash_token(raw_token),
            )
        )
        await db.commit()

    logger.info("LOGOUT user_id=%s", current_user.id)


# ── Me ────────────────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_active_user)):
    """Return the profile of the currently authenticated user."""
    return current_user
