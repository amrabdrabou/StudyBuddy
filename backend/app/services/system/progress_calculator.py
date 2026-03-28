"""Progress calculator — derives BigGoal.progress_pct from micro-goal completion.

Formula:
    progress_pct = round(completed_micro_goals / total_micro_goals * 100)
    clamped to [0, 100].

Trigger this after any micro-goal status change.
"""
from __future__ import annotations

import logging
import uuid

from sqlalchemy import func as sa_func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.big_goal import BigGoal
from app.models.big_goal_subject import BigGoalSubject
from app.models.micro_goal import MicroGoal
from app.models.workspace import Workspace

logger = logging.getLogger(__name__)


async def recalculate_mission_progress(
    workspace_id: uuid.UUID,
    db: AsyncSession,
) -> None:
    """Recalculate progress for all BigGoals linked to this workspace's subject.

    Called after any micro-goal status change within the workspace.
    """
    # ── Find the subject for this workspace ────────────────────────────────────
    ws_result = await db.execute(
        select(Workspace.subject_id).where(Workspace.id == workspace_id)
    )
    subject_id = ws_result.scalar_one_or_none()
    if subject_id is None:
        return

    # ── Find all BigGoals that include this subject ────────────────────────────
    goals_result = await db.execute(
        select(BigGoalSubject.big_goal_id).where(
            BigGoalSubject.subject_id == subject_id
        )
    )
    goal_ids = [row[0] for row in goals_result.all()]
    if not goal_ids:
        return

    for goal_id in goal_ids:
        await _update_goal_progress(goal_id, db)


async def _update_goal_progress(goal_id: uuid.UUID, db: AsyncSession) -> None:
    """Recompute progress_pct for a single BigGoal and persist it."""
    # Get all subject IDs for this goal
    subs_result = await db.execute(
        select(BigGoalSubject.subject_id).where(BigGoalSubject.big_goal_id == goal_id)
    )
    subject_ids = [row[0] for row in subs_result.all()]
    if not subject_ids:
        return

    # Get all workspace IDs for these subjects
    ws_result = await db.execute(
        select(Workspace.id).where(Workspace.subject_id.in_(subject_ids))
    )
    workspace_ids = [row[0] for row in ws_result.all()]
    if not workspace_ids:
        return

    # Count total and completed micro-goals
    counts_result = await db.execute(
        select(
            sa_func.count(MicroGoal.id).label("total"),
            sa_func.count(MicroGoal.id)
            .filter(MicroGoal.status == "completed")
            .label("completed"),
        ).where(MicroGoal.workspace_id.in_(workspace_ids))
    )
    row = counts_result.one()
    total: int = row.total or 0
    completed: int = row.completed or 0

    if total == 0:
        pct = 0
    else:
        pct = max(0, min(100, round(completed / total * 100)))

    # Persist
    goal_result = await db.execute(select(BigGoal).where(BigGoal.id == goal_id))
    goal = goal_result.scalar_one_or_none()
    if goal is not None and goal.progress_pct != pct:
        goal.progress_pct = pct
        await db.commit()
        logger.debug("progress_calculator: goal %s → %d%%", goal_id, pct)
