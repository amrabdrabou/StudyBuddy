"""AI Chat router — persistent conversational chat per workspace."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.api.v1.deps import get_workspace
from app.core.db_setup import get_db
from app.models.ai_chat_message import AIChatMessage
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.ai_chat_message import AIChatMessageCreate, AIChatMessageResponse

router = APIRouter(prefix="/workspaces/{workspace_id}/ai-chat", tags=["ai"])


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
async def send_message(
    workspace_id: uuid.UUID,
    body: AIChatMessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: Workspace = Depends(get_workspace),
):
    """
    Save the user's message and return a placeholder assistant reply.
    Full AI integration (calling Claude) is wired in Layer 5 implementation.
    Returns both the saved user message and the assistant response.
    """
    user_msg = AIChatMessage(
        workspace_id=workspace_id,
        user_id=current_user.id,
        role="user",
        content=body.content,
    )
    db.add(user_msg)
    await db.flush()

    # Placeholder — replaced when AI integration is wired
    assistant_msg = AIChatMessage(
        workspace_id=workspace_id,
        user_id=current_user.id,
        role="assistant",
        content="[AI response pending — integration coming in next phase]",
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
