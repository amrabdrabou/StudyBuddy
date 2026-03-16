"""API router for CRUD operations on uploaded study documents."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.api.v1.utils import get_owned_document
from app.core.db_setup import get_db
from app.models.document import Document
from app.models.document_tag import DocumentTag
from app.models.user import User
from app.schemas.document import DocumentCreate, DocumentResponse, DocumentUpdate
from app.services.document_storage import delete_upload

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("/", response_model=list[DocumentResponse])
async def list_documents(
    study_subject_id: UUID | None = None,
    is_archived: bool = False,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Document)
        .where(Document.user_id == current_user.id, Document.is_archived == is_archived)
    )
    if study_subject_id:
        query = query.where(Document.study_subject_id == study_subject_id)
    result = await db.execute(query.order_by(Document.uploaded_at.desc()))
    return result.scalars().all()


@router.post("/", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_document(
    payload: DocumentCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    tag_ids = payload.tag_ids
    doc = Document(
        user_id=current_user.id,
        **payload.model_dump(exclude={"tag_ids"}),
    )
    db.add(doc)
    await db.flush()  # get doc.id before creating associations

    for tag_id in tag_ids:
        db.add(DocumentTag(document_id=doc.id, tag_id=tag_id))

    await db.commit()
    await db.refresh(doc)
    return doc


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_owned_document(document_id, current_user, db)


@router.patch("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: UUID,
    payload: DocumentUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await get_owned_document(document_id, current_user, db)
    data = payload.model_dump(exclude_unset=True)
    tag_ids = data.pop("tag_ids", None)

    for field, value in data.items():
        setattr(doc, field, value)

    if tag_ids is not None:
        # Replace all tag associations
        await db.execute(
            DocumentTag.__table__.delete().where(DocumentTag.document_id == doc.id)
        )
        for tag_id in tag_ids:
            db.add(DocumentTag(document_id=doc.id, tag_id=tag_id))

    await db.commit()
    await db.refresh(doc)
    return doc


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await get_owned_document(document_id, current_user, db)
    delete_upload(doc.file_path)  # remove file from disk (best-effort, won't raise)
    await db.delete(doc)
    await db.commit()
