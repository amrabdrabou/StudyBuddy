"""Dashboard router — summary stats for the authenticated user."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.core.db_setup import get_db
from app.models.big_goal import BigGoal
from app.models.document import Document
from app.models.flashcard_deck import FlashcardDeck
from app.models.micro_goal import MicroGoal
from app.models.note import Note
from app.models.progress_snapshot import ProgressSnapshot
from app.models.quiz_set import QuizSet
from app.models.session import Session
from app.models.subject import Subject
from app.models.user import User
from app.models.workspace import Workspace

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


class MissionProgress(BaseModel):
    id: uuid.UUID
    title: str
    cover_color: str
    progress_pct: int


class RecentSession(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    title: Optional[str]
    status: str
    started_at: datetime

    model_config = {"from_attributes": True}


class DashboardStats(BaseModel):
    subjects_count: int
    active_workspaces_count: int
    active_big_goals_count: int
    pending_micro_goals_count: int
    documents_count: int
    flashcard_decks_count: int
    quiz_sets_count: int
    notes_count: int
    recent_sessions: List[RecentSession]
    mission_progress: List[MissionProgress]


@router.get("/", response_model=DashboardStats)
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    uid = current_user.id

    async def count(model, *filters):
        result = await db.execute(
            select(func.count()).select_from(model).where(*filters)
        )
        return result.scalar_one()

    subjects_count = await count(Subject, Subject.user_id == uid, Subject.is_archived.is_(False))
    active_workspaces = await count(Workspace, Workspace.user_id == uid, Workspace.status == "active")
    active_big_goals = await count(BigGoal, BigGoal.user_id == uid, BigGoal.status.in_(["active", "ready_to_complete"]))
    pending_micro_goals = await count(MicroGoal,
        MicroGoal.workspace_id.in_(
            select(Workspace.id).where(Workspace.user_id == uid)
        ),
        MicroGoal.status.in_(["pending", "in_progress"]),
    )
    documents_count = await count(Document, Document.uploaded_by_user_id == uid)
    decks_count = await count(FlashcardDeck,
        FlashcardDeck.workspace_id.in_(
            select(Workspace.id).where(Workspace.user_id == uid)
        )
    )
    quiz_count = await count(QuizSet, QuizSet.created_by_user_id == uid)
    notes_count = await count(Note, Note.user_id == uid)

    recent = await db.execute(
        select(Session)
        .where(Session.user_id == uid)
        .order_by(Session.started_at.desc())
        .limit(5)
    )
    recent_sessions = recent.scalars().all()

    # Active missions with snapshot-based progress
    missions_result = await db.execute(
        select(BigGoal).where(
            BigGoal.user_id == uid,
            BigGoal.status.in_(["active", "ready_to_complete"]),
            BigGoal.archived.is_(False),
        )
    )
    missions = missions_result.scalars().all()

    mission_snaps: dict[uuid.UUID, float] = {}
    if missions:
        snap_rows = await db.execute(
            select(ProgressSnapshot.entity_id, ProgressSnapshot.progress_pct).where(
                ProgressSnapshot.user_id == uid,
                ProgressSnapshot.entity_type == "mission",
                ProgressSnapshot.entity_id.in_([m.id for m in missions]),
            )
        )
        mission_snaps = {eid: float(pct) for eid, pct in snap_rows.all()}

    mission_progress_list = [
        MissionProgress(
            id=m.id,
            title=m.title,
            cover_color=m.cover_color,
            progress_pct=round(mission_snaps.get(m.id, 0)),
        )
        for m in missions
    ]

    return DashboardStats(
        subjects_count=subjects_count,
        active_workspaces_count=active_workspaces,
        active_big_goals_count=active_big_goals,
        pending_micro_goals_count=pending_micro_goals,
        documents_count=documents_count,
        flashcard_decks_count=decks_count,
        quiz_sets_count=quiz_count,
        notes_count=notes_count,
        recent_sessions=[RecentSession.model_validate(s) for s in recent_sessions],
        mission_progress=mission_progress_list,
    )
