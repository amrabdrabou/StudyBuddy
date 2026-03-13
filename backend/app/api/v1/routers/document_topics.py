from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.api.v1.utils import get_owned_document
from app.core.db_setup import get_db
from app.models.document_topic import DocumentTopic
from app.models.user import User
from app.schema.document_topic import (
    DocumentTopicCreate,
    DocumentTopicResponse,
    DocumentTopicUpdate,
)

router = APIRouter(prefix="/documents/{document_id}/topics", tags=["document-topics"])


async def _get_topic(document_id: UUID, topic_id: UUID, db: AsyncSession) -> DocumentTopic:
    result = await db.execute(
        select(DocumentTopic).where(
            DocumentTopic.id == topic_id,
            DocumentTopic.document_id == document_id,
        )
    )
    topic = result.scalar_one_or_none()
    if topic is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")
    return topic


@router.get("/", response_model=list[DocumentTopicResponse])
async def list_document_topics(
    document_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_document(document_id, current_user, db)
    result = await db.execute(
        select(DocumentTopic).where(DocumentTopic.document_id == document_id)
    )
    return result.scalars().all()


@router.post("/", response_model=DocumentTopicResponse, status_code=status.HTTP_201_CREATED)
async def create_document_topic(
    document_id: UUID,
    payload: DocumentTopicCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_document(document_id, current_user, db)
    topic = DocumentTopic(document_id=document_id, **payload.model_dump(exclude={"document_id"}))
    db.add(topic)
    await db.commit()
    await db.refresh(topic)
    return topic


@router.patch("/{topic_id}", response_model=DocumentTopicResponse)
async def update_document_topic(
    document_id: UUID,
    topic_id: UUID,
    payload: DocumentTopicUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_document(document_id, current_user, db)
    topic = await _get_topic(document_id, topic_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(topic, field, value)
    await db.commit()
    await db.refresh(topic)
    return topic


@router.delete("/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document_topic(
    document_id: UUID,
    topic_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_document(document_id, current_user, db)
    topic = await _get_topic(document_id, topic_id, db)
    await db.delete(topic)
    await db.commit()
