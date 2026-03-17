"""Documents router — upload and manage documents within a workspace."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.api.v1.deps import get_workspace
from app.core.db_setup import get_db
from app.models.document import Document
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.document import DocumentResponse
from app.services.document_storage import (
    build_storage_path,
    delete_upload,
    make_safe_filename,
    read_and_validate_upload,
    save_upload,
)

router = APIRouter(prefix="/workspaces/{workspace_id}/documents", tags=["documents"])


async def _get_document_or_404(
    document_id: uuid.UUID, workspace_id: uuid.UUID, user: User, db: AsyncSession
) -> Document:
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.workspace_id == workspace_id,
            Document.uploaded_by_user_id == user.id,
        )
    )
    doc = result.scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return doc


@router.get("/", response_model=list[DocumentResponse])
async def list_documents(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Workspace = Depends(get_workspace),
):
    result = await db.execute(
        select(Document)
        .where(Document.workspace_id == workspace_id)
        .order_by(Document.created_at.desc())
    )
    return result.scalars().all()


@router.post("/", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    workspace_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: Workspace = Depends(get_workspace),
):
    content = await read_and_validate_upload(file)

    file_id = uuid.uuid4()
    safe_name = make_safe_filename(file.filename or "document")
    storage_path = build_storage_path(current_user.id, workspace_id, file_id, safe_name)

    save_upload(content, storage_path)

    doc = Document(
        id=file_id,
        workspace_id=workspace_id,
        uploaded_by_user_id=current_user.id,
        original_filename=file.filename or safe_name,
        storage_path=storage_path,
        mime_type=file.content_type or "application/octet-stream",
        file_size=len(content),
        status="uploaded",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    workspace_id: uuid.UUID,
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: Workspace = Depends(get_workspace),
):
    return await _get_document_or_404(document_id, workspace_id, current_user, db)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    workspace_id: uuid.UUID,
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: Workspace = Depends(get_workspace),
):
    doc = await _get_document_or_404(document_id, workspace_id, current_user, db)
    delete_upload(doc.storage_path)
    await db.delete(doc)
    await db.commit()
