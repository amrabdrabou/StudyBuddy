"""AI Chat router — persistent conversational chat per workspace."""
from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.v1.dependencies import get_current_active_user
from app.api.v1.deps import get_workspace
from app.core.config import get_settings
from app.core.db_setup import get_db
from app.core.limiter import limiter
from app.models.ai_chat_message import AIChatMessage
from app.models.document import Document
from app.models.document_content import DocumentContent
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.ai_chat_message import AIChatMessageCreate, AIChatMessageResponse
from app.services.ai_service import ai_chat_reply

router = APIRouter(prefix="/workspaces/{workspace_id}/ai-chat", tags=["ai"])
logger = logging.getLogger(__name__)


async def _load_context(workspace_id: uuid.UUID, db: AsyncSession) -> str:
    """Concatenate document summaries for the workspace as chat context.
    Uses selectinload to avoid N+1 queries.
    """
    docs_result = await db.execute(
        select(Document)
        .options(selectinload(Document.content))
        .where(Document.workspace_id == workspace_id, Document.status == "ready")
    )
    parts: list[str] = []
    for doc in docs_result.scalars().all():
        content = doc.content
        text = (content.summary or content.raw_text or "") if content else ""
        if text:
            parts.append(f"[{doc.original_filename}]\n{text[:2000]}")
    return "\n\n".join(parts)


@router.get("/", response_model=list[AIChatMessageResponse])
async def get_chat_history(
    workspace_id: uuid.UUID,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    _: Workspace = Depends(get_workspace),
):
    result = await db.execute(
        select(AIChatMessage)
        .where(AIChatMessage.workspace_id == workspace_id)
        .order_by(AIChatMessage.created_at.asc())
        .limit(limit)
    )
    return result.scalars().all()


@router.post("/", response_model=list[AIChatMessageResponse], status_code=status.HTTP_201_CREATED)
@limiter.limit(get_settings().ai_event_rate_limit)
async def send_message(
    request: Request,
    workspace_id: uuid.UUID,
    body: AIChatMessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    ws: Workspace = Depends(get_workspace),
):
    """Save user message, call the LLM, return both messages."""
    # Persist user message
    user_msg = AIChatMessage(
        workspace_id=workspace_id,
        user_id=current_user.id,
        role="user",
        content=body.content,
    )
    db.add(user_msg)
    await db.flush()

    # Load last 21 messages as history (21st will be trimmed inside ai_chat_reply)
    history_result = await db.execute(
        select(AIChatMessage)
        .where(AIChatMessage.workspace_id == workspace_id)
        .order_by(AIChatMessage.created_at.desc())
        .limit(21)
    )
    history = [
        {"role": m.role, "content": m.content}
        for m in reversed(history_result.scalars().all())
    ]

    context = await _load_context(workspace_id, db)

    try:
        reply_text = await ai_chat_reply(
            history=history,
            workspace_title=ws.title,
            context=context,
            db=db,
            user_id=current_user.id,
        )
    except Exception as exc:
        logger.error("AI chat failed workspace=%s user=%s: %s", workspace_id, current_user.id, exc)
        reply_text = f"I'm unable to respond right now. Please try again. (Error: {type(exc).__name__})"

    assistant_msg = AIChatMessage(
        workspace_id=workspace_id,
        user_id=current_user.id,
        role="assistant",
        content=reply_text,
    )
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(user_msg)
    await db.refresh(assistant_msg)

    return [user_msg, assistant_msg]


@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
async def clear_chat_history(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Workspace = Depends(get_workspace),
):
    result = await db.execute(
        select(AIChatMessage).where(AIChatMessage.workspace_id == workspace_id)
    )
    for msg in result.scalars().all():
        await db.delete(msg)
    await db.commit()
