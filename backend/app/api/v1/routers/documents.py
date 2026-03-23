"""Documents router — upload and manage documents within a workspace."""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.api.v1.deps import get_workspace
from app.core.db_setup import AsyncSessionLocal, get_db
from app.models.document import Document
from app.models.document_content import DocumentContent
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.document import DocumentResponse
from app.services.document_extraction import ExtractionError, extract_text
from app.services.document_storage import (
    build_storage_path,
    delete_upload,
    make_safe_filename,
    read_and_validate_upload,
    resolve_storage_path,
    save_upload,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/workspaces/{workspace_id}/documents", tags=["documents"])


# ── Background extraction ─────────────────────────────────────────────────────

async def _run_extraction(doc_id: uuid.UUID, storage_path: str, mime_type: str) -> None:
    """
    Background task: extract text from the uploaded file and store in DocumentContent.
    Runs after the upload response has been sent to the client.
    """
    async with AsyncSessionLocal() as db:
        # Mark as processing
        result = await db.execute(select(Document).where(Document.id == doc_id))
        doc = result.scalar_one_or_none()
        if doc is None:
            return
        doc.status = "processing"
        await db.commit()

        try:
            file_path = resolve_storage_path(storage_path)
            raw_text = extract_text(file_path, mime_type)
            word_count = len(raw_text.split()) if raw_text else 0

            engine_map = {
                "application/pdf": "pypdf",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "python-docx",
                "application/msword": "python-docx",
                "text/plain": "built-in",
            }

            content = DocumentContent(
                document_id=doc_id,
                raw_text=raw_text,
                word_count=word_count,
                extraction_engine=engine_map.get(mime_type, "unknown"),
                extracted_at=datetime.now(timezone.utc),
            )
            db.add(content)

            # Reload doc in this session to update status
            result = await db.execute(select(Document).where(Document.id == doc_id))
            doc = result.scalar_one_or_none()
            if doc:
                doc.status = "ready"
            await db.commit()

        except ExtractionError as exc:
            logger.warning("Extraction failed for doc %s: %s", doc_id, exc)
            result = await db.execute(select(Document).where(Document.id == doc_id))
            doc = result.scalar_one_or_none()
            if doc:
                doc.status = "failed"
                doc.error_message = str(exc) or "Text extraction failed."
            await db.commit()

        except Exception as exc:
            logger.exception("Unexpected error extracting doc %s", doc_id)
            result = await db.execute(select(Document).where(Document.id == doc_id))
            doc = result.scalar_one_or_none()
            if doc:
                doc.status = "failed"
                doc.error_message = f"Unexpected error: {exc}"
            await db.commit()


# ── Helpers ───────────────────────────────────────────────────────────────────

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


# ── Endpoints ─────────────────────────────────────────────────────────────────

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
    background_tasks: BackgroundTasks,
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

    mime = file.content_type or "application/octet-stream"
    doc = Document(
        id=file_id,
        workspace_id=workspace_id,
        uploaded_by_user_id=current_user.id,
        original_filename=file.filename or safe_name,
        storage_path=storage_path,
        mime_type=mime,
        file_size=len(content),
        status="uploaded",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    background_tasks.add_task(_run_extraction, file_id, storage_path, mime)

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


@router.get("/{document_id}/content")
async def get_document_content(
    workspace_id: uuid.UUID,
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: Workspace = Depends(get_workspace),
):
    doc = await _get_document_or_404(document_id, workspace_id, current_user, db)
    result = await db.execute(
        select(DocumentContent).where(DocumentContent.document_id == doc.id)
    )
    content = result.scalar_one_or_none()
    if content is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not yet extracted")
    return {
        "raw_text": content.raw_text,
        "summary": content.summary,
        "word_count": content.word_count,
        "page_count": content.page_count,
    }


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
