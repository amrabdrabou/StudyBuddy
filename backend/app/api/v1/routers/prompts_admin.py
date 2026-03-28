"""Admin API for managing LLM prompt templates.

All endpoints require the "system:admin" permission (developer role).

Endpoints:
  GET    /admin/prompts              — list all prompts (filterable by name/role/active)
  GET    /admin/prompts/{id}         — get single prompt
  POST   /admin/prompts              — create new prompt version
  PATCH  /admin/prompts/{id}         — update template / toggle active
  DELETE /admin/prompts/{id}         — hard delete

  GET    /admin/llm-logs             — list recent LLM interaction logs
  GET    /admin/llm-logs/{id}        — get single log entry (includes full_prompt)
"""
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db_setup import get_db
from app.core.rbac import require_permission
from app.models.llm_log import LLMLog
from app.models.prompt import Prompt
from app.models.user import User
from app.schemas.prompt import LLMLogResponse, PromptCreate, PromptResponse, PromptUpdate

router = APIRouter(prefix="/admin", tags=["admin-prompts"])

# Reusable dependency: requires "system:admin" permission (developer role only)
_admin_dep = Depends(require_permission("system", "admin"))


# ── Prompts CRUD ───────────────────────────────────────────────────────────────

@router.get("/prompts", response_model=list[PromptResponse])
async def list_prompts(
    name: str | None = Query(default=None, description="Filter by prompt name"),
    role: str | None = Query(default=None, description="Filter by role (system|user)"),
    active_only: bool = Query(default=False, description="Return only is_active=true rows"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission("system", "admin")),
):
    """List all prompt rows. Supports filtering by name, role, and active status."""
    query = select(Prompt).order_by(Prompt.name, Prompt.role, Prompt.version.desc())
    if name:
        query = query.where(Prompt.name == name)
    if role:
        query = query.where(Prompt.role == role)
    if active_only:
        query = query.where(Prompt.is_active.is_(True))

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/prompts/{prompt_id}", response_model=PromptResponse)
async def get_prompt(
    prompt_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission("system", "admin")),
):
    row = await db.get(Prompt, prompt_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prompt not found")
    return row


@router.post("/prompts", response_model=PromptResponse, status_code=status.HTTP_201_CREATED)
async def create_prompt(
    body: PromptCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission("system", "admin")),
):
    """Create a new prompt row.

    If is_active=True and another active row exists for the same (name, role),
    the existing one is automatically deactivated to maintain the one-active constraint.
    """
    if body.is_active:
        existing = await db.execute(
            select(Prompt).where(
                Prompt.name == body.name,
                Prompt.role == body.role,
                Prompt.is_active.is_(True),
            )
        )
        for old in existing.scalars().all():
            old.is_active = False

    prompt = Prompt(**body.model_dump())
    db.add(prompt)
    await db.commit()
    await db.refresh(prompt)
    return prompt


@router.patch("/prompts/{prompt_id}", response_model=PromptResponse)
async def update_prompt(
    prompt_id: uuid.UUID,
    body: PromptUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission("system", "admin")),
):
    """Update a prompt's template, description, or active status.

    Activating a prompt automatically deactivates any other active prompt
    with the same (name, role).
    """
    prompt = await db.get(Prompt, prompt_id)
    if prompt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prompt not found")

    if body.template is not None:
        prompt.template = body.template
    if body.description is not None:
        prompt.description = body.description
    if body.is_active is not None:
        if body.is_active and not prompt.is_active:
            # Deactivate existing active prompt for same (name, role)
            existing = await db.execute(
                select(Prompt).where(
                    Prompt.name == prompt.name,
                    Prompt.role == prompt.role,
                    Prompt.is_active.is_(True),
                    Prompt.id != prompt_id,
                )
            )
            for old in existing.scalars().all():
                old.is_active = False
        prompt.is_active = body.is_active

    await db.commit()
    await db.refresh(prompt)
    return prompt


@router.delete("/prompts/{prompt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_prompt(
    prompt_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission("system", "admin")),
):
    prompt = await db.get(Prompt, prompt_id)
    if prompt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prompt not found")
    await db.delete(prompt)
    await db.commit()


# ── LLM Logs ──────────────────────────────────────────────────────────────────

@router.get("/llm-logs", response_model=list[LLMLogResponse])
async def list_llm_logs(
    prompt_name: str | None = Query(default=None),
    user_id: Annotated[uuid.UUID | None, Query()] = None,
    limit: int = Query(default=50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission("system", "admin")),
):
    """List recent LLM interaction logs, newest first."""
    query = (
        select(LLMLog)
        .order_by(LLMLog.created_at.desc())
        .limit(limit)
    )
    if prompt_name:
        query = query.where(LLMLog.prompt_name == prompt_name)
    if user_id:
        query = query.where(LLMLog.user_id == user_id)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/llm-logs/{log_id}", response_model=LLMLogResponse)
async def get_llm_log(
    log_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission("system", "admin")),
):
    row = await db.get(LLMLog, log_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Log entry not found")
    return row
