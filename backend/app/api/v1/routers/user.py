"""API router for reading and updating the currently authenticated user's profile."""
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.core.db_setup import get_db
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])
logger = logging.getLogger(__name__)

# Fields that users are allowed to update on their own profile.
# Explicitly whitelisted to prevent privilege escalation (e.g. setting is_superuser via API).
_UPDATABLE_FIELDS = frozenset({
    "first_name",
    "last_name",
    "username",
    "timezone",
    "study_goal_minutes_per_day",
    "preferred_study_time",
    "profile_picture_url",
})


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_active_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update the current user's profile.
    Only fields in _UPDATABLE_FIELDS may be changed — any attempt to mutate
    sensitive fields (is_active, is_superuser, hashed_password, etc.) is
    silently ignored at the schema level and blocked here as a defence-in-depth.
    """
    updates = payload.model_dump(exclude_unset=True)

    for field, value in updates.items():
        if field not in _UPDATABLE_FIELDS:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Field '{field}' cannot be modified via this endpoint.",
            )
        setattr(current_user, field, value)

    await db.commit()
    await db.refresh(current_user)
    logger.info("PROFILE_UPDATE user_id=%s fields=%s", current_user.id, list(updates.keys()))
    return current_user
