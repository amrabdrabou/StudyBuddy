from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.api.v1.utils import get_owned_session
from app.core.db_setup import get_db
from app.models.session_reflection import SessionReflection
from app.models.user import User
from app.schema.session_reflection import (
    SessionReflectionCreate,
    SessionReflectionResponse,
    SessionReflectionUpdate,
)

router = APIRouter(prefix="/sessions/{session_id}/reflections", tags=["session-reflections"])


async def _get_reflection(session_id: UUID, reflection_id: UUID, db: AsyncSession) -> SessionReflection:
    result = await db.execute(
        select(SessionReflection).where(
            SessionReflection.id == reflection_id,
            SessionReflection.session_id == session_id,
        )
    )
    r = result.scalar_one_or_none()
    if r is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reflection not found")
    return r


@router.get("/", response_model=list[SessionReflectionResponse])
async def list_reflections(
    session_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_session(session_id, current_user, db)
    result = await db.execute(
        select(SessionReflection).where(SessionReflection.session_id == session_id)
    )
    return result.scalars().all()


@router.post("/", response_model=SessionReflectionResponse, status_code=status.HTTP_201_CREATED)
async def create_reflection(
    session_id: UUID,
    payload: SessionReflectionCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_session(session_id, current_user, db)
    reflection = SessionReflection(
        session_id=session_id,
        ai_event_id=payload.ai_event_id,
        question_text=payload.question_text,
    )
    db.add(reflection)
    await db.commit()
    await db.refresh(reflection)
    return reflection


@router.patch("/{reflection_id}", response_model=SessionReflectionResponse)
async def update_reflection(
    session_id: UUID,
    reflection_id: UUID,
    payload: SessionReflectionUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_session(session_id, current_user, db)
    reflection = await _get_reflection(session_id, reflection_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(reflection, field, value)
    await db.commit()
    await db.refresh(reflection)
    return reflection
