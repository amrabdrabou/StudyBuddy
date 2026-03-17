"""
Shared FastAPI dependencies for resource-level access.
These are injected via Depends() and carry ownership validation.

auth.py holds token/user auth.
This file holds the next layer: verified resource access.
"""
from __future__ import annotations

import uuid
from typing import Any, Dict, Type, TypeVar

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import DeclarativeBase

from app.api.v1.dependencies import get_current_active_user
from app.core.db_setup import Base, get_db
from app.models.subject import Subject
from app.models.user import User
from app.models.workspace import Workspace

T = TypeVar("T", bound=Base)


# ── Generic helpers ───────────────────────────────────────────────────────────

async def get_or_404(
    db: AsyncSession,
    model: Type[T],
    detail: str,
    *filters,
) -> T:
    """Fetch a single ORM row matching all filters or raise 404."""
    result = await db.execute(select(model).where(*filters))
    obj = result.scalar_one_or_none()
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)
    return obj


def apply_updates(instance: Any, data: Dict[str, Any]) -> None:
    """Apply a dict of field→value pairs onto an ORM instance in-place."""
    for field, value in data.items():
        setattr(instance, field, value)


# ── Resource dependencies ─────────────────────────────────────────────────────

async def get_workspace(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Workspace:
    """Verify the workspace exists and belongs to the current user."""
    return await get_or_404(
        db, Workspace, "Workspace not found",
        Workspace.id == workspace_id,
        Workspace.user_id == current_user.id,
    )


async def get_subject(
    subject_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Subject:
    """Verify the subject exists and belongs to the current user."""
    return await get_or_404(
        db, Subject, "Subject not found",
        Subject.id == subject_id,
        Subject.user_id == current_user.id,
    )
