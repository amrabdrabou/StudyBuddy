from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.api.v1.utils import get_owned_session
from app.core.db_setup import get_db
from app.models.session_topic import SessionTopic
from app.models.user import User
from app.schema.session_topic import (
    SessionTopicCreate,
    SessionTopicResponse,
    SessionTopicUpdate,
)

router = APIRouter(prefix="/sessions/{session_id}/topics", tags=["session-topics"])


async def _get_topic(session_id: UUID, topic_id: UUID, db: AsyncSession) -> SessionTopic:
    result = await db.execute(
        select(SessionTopic).where(
            SessionTopic.id == topic_id,
            SessionTopic.session_id == session_id,
        )
    )
    topic = result.scalar_one_or_none()
    if topic is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")
    return topic


@router.get("/", response_model=list[SessionTopicResponse])
async def list_session_topics(
    session_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_session(session_id, current_user, db)
    result = await db.execute(
        select(SessionTopic).where(SessionTopic.session_id == session_id)
    )
    return result.scalars().all()


@router.post("/", response_model=SessionTopicResponse, status_code=status.HTTP_201_CREATED)
async def create_session_topic(
    session_id: UUID,
    payload: SessionTopicCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_session(session_id, current_user, db)
    topic = SessionTopic(session_id=session_id, **payload.model_dump())
    db.add(topic)
    await db.commit()
    await db.refresh(topic)
    return topic


@router.patch("/{topic_id}", response_model=SessionTopicResponse)
async def update_session_topic(
    session_id: UUID,
    topic_id: UUID,
    payload: SessionTopicUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_session(session_id, current_user, db)
    topic = await _get_topic(session_id, topic_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(topic, field, value)
    await db.commit()
    await db.refresh(topic)
    return topic


@router.delete("/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session_topic(
    session_id: UUID,
    topic_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_session(session_id, current_user, db)
    topic = await _get_topic(session_id, topic_id, db)
    await db.delete(topic)
    await db.commit()
