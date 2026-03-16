"""
Document upload pipeline and session-scoped document endpoints.

Kept separate from documents.py (which handles generic CRUD over existing
documents) because this router owns the full upload flow:
  multipart upload → validation → file storage → DB record → extraction

Endpoints:
  POST   /sessions/{session_id}/documents/upload      — upload a file
  GET    /sessions/{session_id}/documents             — list documents in session
  GET    /documents/{document_id}/download            — download original file
  POST   /documents/{document_id}/retry-processing    — retry failed extraction
"""
import logging
import uuid as uuid_module
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.api.v1.utils import get_owned_document, get_owned_session
from app.core.db_setup import get_db
from app.models.document import Document
from app.models.session_document import SessionDocument
from app.models.user import User
from app.schemas.document import DocumentResponse
from app.services.document_extraction import ExtractionError, extract_text
from app.services.document_storage import (
    ALLOWED_MIME_TYPES,
    build_storage_path,
    delete_upload,
    make_safe_filename,
    read_and_validate_upload,
    resolve_storage_path,
    save_upload,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["document-upload"])


# ── Upload ────────────────────────────────────────────────────────────────────

@router.post(
    "/sessions/{session_id}/documents/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a document into a study session",
)
async def upload_document(
    session_id: UUID,
    file: UploadFile = File(..., description="Document file — PDF, DOCX, or TXT"),
    title: str = Form(None, description="Display title. Defaults to the original filename."),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Full upload pipeline (Steps 3–7):

    3. Validate session ownership + file type / size / non-empty
    4. Save file to local storage with a UUID-based safe path
    5. Create Document + SessionDocument DB records
    6. Run text extraction
    7. Persist extracted text or mark failed
    """
    # Step 3a — session ownership
    await get_owned_session(session_id, current_user, db)

    # Step 3b — read file and validate type / size / emptiness
    content = await read_and_validate_upload(file)

    # Step 4 — build a safe storage path, save file
    file_id = uuid_module.uuid4()
    safe_name = make_safe_filename(file.filename or "document")
    stored_filename = f"{file_id}_{safe_name}"
    relative_path = build_storage_path(current_user.id, session_id, file_id, safe_name)

    try:
        save_upload(content, relative_path)
    except OSError as exc:
        logger.exception("Storage write failed for session %s", session_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not save file: {exc}",
        )

    # Step 5 — create Document record (upload_status = uploaded)
    doc = Document(
        user_id=current_user.id,
        title=(title or "").strip() or (file.filename or safe_name),
        file_name=file.filename or safe_name,
        stored_filename=stored_filename,
        file_path=relative_path,
        file_type=file.content_type,
        file_size_bytes=len(content),
        upload_status="uploaded",
        processing_status="pending",
        extraction_status="not_started",
    )
    db.add(doc)
    await db.flush()  # resolve doc.id before creating the session link

    # Step 5 — link document to session
    db.add(SessionDocument(session_id=session_id, document_id=doc.id))
    await db.commit()
    await db.refresh(doc)

    logger.info("Document %s created for session %s", doc.id, session_id)

    # Steps 6–7 — extract text (synchronous for MVP)
    # TODO: move to a background task / Celery job for production
    await _run_extraction(db, doc)
    await db.refresh(doc)

    return doc


# ── List session documents ────────────────────────────────────────────────────

@router.get(
    "/sessions/{session_id}/documents",
    response_model=list[DocumentResponse],
    summary="List all documents uploaded to a session",
)
async def list_session_documents(
    session_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_session(session_id, current_user, db)

    result = await db.execute(
        select(Document)
        .join(SessionDocument, SessionDocument.document_id == Document.id)
        .where(SessionDocument.session_id == session_id)
        .order_by(Document.uploaded_at.desc())
    )
    return result.scalars().all()


# ── Download ──────────────────────────────────────────────────────────────────

@router.get(
    "/documents/{document_id}/download",
    summary="Download the original document file",
)
async def download_document(
    document_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await get_owned_document(document_id, current_user, db)

    try:
        abs_path = resolve_storage_path(doc.file_path)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Invalid storage path on this document.",
        )

    if not abs_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found in storage.",
        )

    return FileResponse(
        path=str(abs_path),
        filename=doc.file_name,
        media_type=doc.file_type,
    )


# ── Retry processing ──────────────────────────────────────────────────────────

@router.post(
    "/documents/{document_id}/retry-processing",
    response_model=DocumentResponse,
    summary="Retry text extraction for a document that failed",
)
async def retry_processing(
    document_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await get_owned_document(document_id, current_user, db)

    if doc.extraction_status not in ("failed", "not_started"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Cannot retry: extraction_status is '{doc.extraction_status}'. "
                f"Only 'failed' or 'not_started' documents can be retried."
            ),
        )

    await _run_extraction(db, doc)
    await db.refresh(doc)
    return doc


# ── Extraction helper ─────────────────────────────────────────────────────────

async def _run_extraction(db: AsyncSession, doc: Document) -> None:
    """
    Runs text extraction and persists the result.

    Sets processing_status in sync with extraction_status so the frontend's
    existing polling logic (which watches processing_status) still works:
      pending      → extracting  (processing_status = "processing")
      extracting   → extracted   (processing_status = "completed")
      extracting   → failed      (processing_status = "failed")

    Does NOT raise — upload already succeeded. A failed extraction is
    recorded on the document and can be retried via the retry endpoint.
    """
    doc.extraction_status = "extracting"
    doc.processing_status = "processing"
    doc.error_message = None
    await db.commit()

    try:
        abs_path = resolve_storage_path(doc.file_path)
        text = extract_text(abs_path, doc.file_type)
        doc.extracted_text = text
        doc.extraction_status = "extracted"
        doc.processing_status = "completed"  # ready for AI pipeline (Step 8)
        logger.info("Extraction complete for document %s (%d chars)", doc.id, len(text))
    except ExtractionError as exc:
        doc.extraction_status = "failed"
        doc.processing_status = "failed"
        doc.error_message = str(exc)
        logger.warning("Extraction failed for document %s: %s", doc.id, exc)

    await db.commit()
