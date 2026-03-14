"""API router handling user registration, login, token refresh, and OAuth2 flows."""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.core.db_setup import get_db
from app.core.security import generate_token, hash_password, token_expiry, verify_password
from app.models.token import Token
from app.models.user import User
from app.schema.auth import TokenOut
from app.schema.user import UserCreate, UserResponse

router = APIRouter(prefix="/auth", tags=["Auth"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_username(email: str) -> str:
    """Turn 'john.doe@gmail.com' into 'john.doe' as a base username."""
    return email.split("@")[0].strip().lower().replace(" ", "")[:30] or "user"


async def _unique_username(db: AsyncSession, email: str) -> str:
    """Keep adding a counter suffix until the username is not taken."""
    base = _make_username(email)
    candidate = base
    counter = 1

    while True:
        taken = await db.execute(select(User).where(User.username == candidate))
        if taken.scalar_one_or_none() is None:
            return candidate          # free — use it
        counter += 1
        candidate = f"{base}{counter}"[:40]


# ── Register ──────────────────────────────────────────────────────────────────

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    """
    Create a new local account.

    Steps:
    1. Make sure the email / username isn't already taken.
    2. Hash the plain-text password — we never store the original.
    3. Save the new user and return it.
    """

    # 1. Duplicate check
    result = await db.execute(
        select(User).where(
            or_(User.email == payload.email, User.username == payload.username)
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        field = "Email" if existing.email == payload.email else "Username"
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"{field} already taken")

    # 2. Build the user — password is hashed before touching the DB
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

    # 3. Save
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return user


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenOut)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """
    Exchange email/username + password for an access token.

    Steps:
    1. Find the user by email or username.
    2. Verify the password against the stored hash.
    3. Generate a random token string and save it to the DB.
    4. Return the token — the client stores it and sends it on every request.
    """

    # 1. Find user (the OAuth2 form puts the identifier in `username`)
    result = await db.execute(
        select(User).where(
            or_(User.email == form_data.username, User.username == form_data.username)
        )
    )
    user = result.scalar_one_or_none()

    # Same error for "not found" and "wrong password" — don't leak which one
    if user is None or user.hashed_password is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. Check password
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")

    # 3. Create a DB token — random string + expiry timestamp
    db_token = Token(
        user_id=user.id,
        token=generate_token(),
        expires_at=token_expiry(),
    )
    db.add(db_token)
    await db.commit()
    await db.refresh(db_token)

    # 4. Return the token string to the client
    return TokenOut(access_token=db_token.token)


# ── Me ────────────────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_active_user)):
    """
    Return the profile of whoever is making this request.
    The dependency reads the token from the Authorization header,
    looks it up in the DB, and hands us the User object.
    """
    return current_user
