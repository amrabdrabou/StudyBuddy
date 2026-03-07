from app.api.v1.dependencies import get_current_active_user
from app.core.db_setup import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import Token
from app.schemas.user import UserCreate, UserResponse
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/auth", tags=["Auth"])


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
    # form_data.username ممكن يكون email أو username
    result = await db.execute(
        select(User).where(
            or_(
                User.email == form_data.username,
                User.username == form_data.username,
            )
        )
    )
    user = result.scalar_one_or_none()

    if user is None or not verify_password(form_data.password, user.hashed_password):
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

    return Token(
        access_token=access_token,
        token_type="bearer",
    )


@router.get("/me", response_model=UserResponse)
async def read_me(
    current_user: User = Depends(get_current_active_user),
) -> UserResponse:
    return current_user
