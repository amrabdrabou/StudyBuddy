from typing import Optional
from urllib.parse import urlencode

from app.api.v1.dependencies import get_current_active_user
from app.core.config import get_settings
from app.core.db_setup import get_db
from app.core.oauth import oauth
from app.core.security import create_access_token, hash_password, verify_password
from backend.app.models.user import User
from app.schemas.auth import Token
from app.schemas.user import UserCreate, UserResponse
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/auth", tags=["Auth"])

settings = get_settings()


def make_username(email: str) -> str:
    base = email.split("@")[0].strip().lower().replace(" ", "")
    return base[:30] if base else "user"


async def generate_unique_username(db: AsyncSession, email: str) -> str:
    base = make_username(email)
    candidate = base
    counter = 1

    while True:
        result = await db.execute(select(User).where(User.username == candidate))
        existing = result.scalar_one_or_none()
        if existing is None:
            return candidate

        counter += 1
        candidate = f"{base}{counter}"[:40]


@router.post(
    "/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
async def register(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    result = await db.execute(
        select(User).where(
            or_(
                User.email == payload.email,
                User.username == payload.username,
            )
        )
    )
    existing_user = result.scalar_one_or_none()

    if existing_user:
        if existing_user.email == payload.email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already taken",
        )

    user = User(
        email=payload.email,
        username=payload.username,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        timezone=payload.timezone,
        study_goal_minutes_per_day=payload.study_goal_minutes_per_day,
        auth_provider="local",
        is_verified=False,
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    return user


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> Token:
    result = await db.execute(
        select(User).where(
            or_(
                User.email == form_data.username,
                User.username == form_data.username,
            )
        )
    )
    user = result.scalar_one_or_none()

    if user is None or user.hashed_password is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )

    access_token = create_access_token(subject=user.id)
    return Token(access_token=access_token)


@router.get("/google/login")
async def google_login(request: Request):
    redirect_uri = settings.google_redirect_uri
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback")
async def google_callback(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google authorization failed: {str(exc)}",
        )

    userinfo = token.get("userinfo")
    if not userinfo:
        # fallback لو userinfo لم ترجع مباشرة
        userinfo = await oauth.google.userinfo(token=token)

    email: Optional[str] = userinfo.get("email")
    full_name: Optional[str] = userinfo.get("name")
    provider_user_id: Optional[str] = userinfo.get("sub")
    email_verified: bool = bool(userinfo.get("email_verified", False))

    if not email or not provider_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google did not return the required user information",
        )

    # 1) دور على user مربوط بنفس provider_user_id
    result = await db.execute(
        select(User).where(
            User.auth_provider == "google",
            User.provider_user_id == provider_user_id,
        )
    )
    user = result.scalar_one_or_none()

    # 2) لو مش موجود، دور بالإيميل
    if user is None:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if user:
            # اربط حساب Google بالحساب الموجود
            user.auth_provider = "google"
            user.provider_user_id = provider_user_id
            user.is_verified = email_verified or user.is_verified
            if not user.full_name and full_name:
                user.full_name = full_name
        else:
            username = await generate_unique_username(db, email)
            user = User(
                email=email,
                username=username,
                hashed_password=None,
                full_name=full_name,
                auth_provider="google",
                provider_user_id=provider_user_id,
                is_verified=email_verified,
                is_active=True,
            )
            db.add(user)

    await db.commit()
    await db.refresh(user)

    app_token = create_access_token(subject=user.id)

    # خيار 1: ترجع JSON
    return Token(access_token=app_token)

    # خيار 2: redirect للفرونت
    # frontend_url = "http://localhost:5173/auth/callback"
    # url = f"{frontend_url}?{urlencode({'access_token': app_token, 'token_type': 'bearer'})}"
    # return RedirectResponse(url=url, status_code=302)


@router.get("/me", response_model=UserResponse)
async def read_me(
    current_user: User = Depends(get_current_active_user),
) -> UserResponse:
    return current_user
