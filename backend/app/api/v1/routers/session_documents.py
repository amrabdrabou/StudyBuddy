"""API router for attaching and removing documents from a study session."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.api.v1.utils import get_owned_session
from app.core.db_setup import get_db
from app.models.session_document import SessionDocument
from app.models.user import User
from app.schema.session_document import SessionDocumentCreate, SessionDocumentResponse

router = APIRouter(prefix="/sessions/{session_id}/documents", tags=["session-documents"])


@router.get("/", response_model=list[SessionDocumentResponse])
async def list_session_documents(
    session_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_session(session_id, current_user, db)
    result = await db.execute(
        select(SessionDocument).where(SessionDocument.session_id == session_id)
    )
    return result.scalars().all()


@router.post("/", response_model=SessionDocumentResponse, status_code=status.HTTP_201_CREATED)
async def link_document(
    session_id: UUID,
    payload: SessionDocumentCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_session(session_id, current_user, db)
    session_doc = SessionDocument(session_id=session_id, document_id=payload.document_id)
    db.add(session_doc)
    await db.commit()
    await db.refresh(session_doc)
    return session_doc


@router.delete("/{session_doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unlink_document(
    session_id: UUID,
    session_doc_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_session(session_id, current_user, db)
    result = await db.execute(
        select(SessionDocument).where(
            SessionDocument.id == session_doc_id,
            SessionDocument.session_id == session_id,
        )
    )
    session_doc = result.scalar_one_or_none()
    if session_doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session document not found")
    await db.delete(session_doc)
    await db.commit()
