"""Progress service — computes and cascades derived progress snapshots.

Design principles
-----------------
* Progress is NEVER stored on core entity tables (workspace, subject, …).
* All reads come from ``progress_snapshots`` (fast, indexed).
* Every change is logged to ``progress_events`` for history / analytics.
* The entire cascade is driven by a single entry-point:
  ``update_session_progress(session_id, user_id, db, …)``
* Each level propagates upward automatically; callers don't need to know
  about the hierarchy.
* Failures are isolated — a progress update error never aborts the
  primary operation.  Call sites wrap with try/except.

Progress formulas
-----------------
Session:
    if has_fc and has_quiz:   0.6 * fc_pct  +  0.4 * quiz_pct
    elif has_fc:               fc_pct
    elif has_quiz:             quiz_pct
    else:                      100 if completed else 0

MicroGoal (weighted average of linked session snapshots):
    if status == "completed":  100
    elif no linked sessions:    0
    else:  Σ(session_pct × weight) / Σ(weight)

Workspace:  avg(microgoal snapshots)   — skipped goals excluded
Subject:    avg(workspace snapshots)   — canceled workspaces excluded
Mission:    avg(subject snapshots)
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.big_goal_subject import BigGoalSubject
from app.models.flashcard import Flashcard
from app.models.flashcard_review import FlashcardReview
from app.models.micro_goal import MicroGoal
from app.models.progress_event import ProgressEvent
from app.models.progress_snapshot import ProgressSnapshot
from app.models.quiz_attempt import QuizAttempt
from app.models.session import Session
from app.models.session_micro_goal import SessionMicroGoal
from app.models.workspace import Workspace

log = logging.getLogger(__name__)

# ── Helpers ───────────────────────────────────────────────────────────────────

def _clamp(value: float) -> float:
    """Clamp progress to [0, 100]."""
    return max(0.0, min(100.0, value))


async def _get_old_pct(
    db: AsyncSession,
    user_id: uuid.UUID,
    entity_type: str,
    entity_id: uuid.UUID,
) -> float:
    """Return the current snapshot value (0 if none exists)."""
    row = await db.scalar(
        select(ProgressSnapshot.progress_pct).where(
            ProgressSnapshot.user_id == user_id,
            ProgressSnapshot.entity_type == entity_type,
            ProgressSnapshot.entity_id == entity_id,
        )
    )
    return float(row) if row is not None else 0.0


async def get_progress_snapshot_map(
    db: AsyncSession,
    user_id: uuid.UUID,
    entity_type: str,
    entity_ids: list[uuid.UUID],
) -> dict[uuid.UUID, float]:
    """Return snapshot progress for the given entities keyed by entity_id."""
    if not entity_ids:
        return {}

    rows = await db.execute(
        select(ProgressSnapshot.entity_id, ProgressSnapshot.progress_pct).where(
            ProgressSnapshot.user_id == user_id,
            ProgressSnapshot.entity_type == entity_type,
            ProgressSnapshot.entity_id.in_(entity_ids),
        )
    )
    return {entity_id: float(progress_pct) for entity_id, progress_pct in rows.all()}


async def _upsert_snapshot(
    db: AsyncSession,
    user_id: uuid.UUID,
    entity_type: str,
    entity_id: uuid.UUID,
    progress_pct: float,
    metadata: Optional[dict],
    source_type: str,
    source_id: Optional[uuid.UUID],
) -> None:
    """Upsert a ProgressSnapshot and append a ProgressEvent."""
    progress_pct = _clamp(round(progress_pct, 2))
    old_pct = await _get_old_pct(db, user_id, entity_type, entity_id)

    now = datetime.now(timezone.utc)

    # Upsert via ON CONFLICT DO UPDATE (single round-trip)
    stmt = pg_insert(ProgressSnapshot).values(
        user_id=user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        progress_pct=progress_pct,
        metadata_json=metadata,
        computed_at=now,
    )
    stmt = stmt.on_conflict_do_update(
        constraint="uq_progress_snapshot_user_entity",
        set_=dict(
            progress_pct=stmt.excluded.progress_pct,
            metadata_json=stmt.excluded.metadata_json,
            computed_at=stmt.excluded.computed_at,
        ),
    )
    await db.execute(stmt)

    # Always log the event (enables full history even when delta == 0)
    db.add(
        ProgressEvent(
            user_id=user_id,
            entity_type=entity_type,
            entity_id=entity_id,
            source_type=source_type,
            source_id=source_id,
            old_progress_pct=old_pct,
            new_progress_pct=progress_pct,
            delta_progress=round(progress_pct - old_pct, 2),
            metadata_json=metadata,
            created_at=now,
        )
    )


# ── Session progress ──────────────────────────────────────────────────────────

async def _compute_session_pct(
    session: Session,
    db: AsyncSession,
) -> tuple[float, dict]:
    """Return (progress_pct, metadata_dict) for a session."""
    fc_pct: Optional[float] = None
    quiz_pct: Optional[float] = None
    meta: dict = {}

    # ── Flashcard component ───────────────────────────────────────────────────
    if session.flashcard_deck_id:
        total_cards: int = await db.scalar(
            select(func.count(Flashcard.id)).where(
                Flashcard.deck_id == session.flashcard_deck_id
            )
        ) or 0

        if total_cards > 0:
            # Count distinct cards rated "good" (quality >= 3) in this session
            good_cards: int = await db.scalar(
                select(func.count(func.distinct(FlashcardReview.flashcard_id))).where(
                    FlashcardReview.session_id == session.id,
                    FlashcardReview.quality_rating >= 3,
                )
            ) or 0
            fc_pct = min(good_cards / total_cards, 1.0)
            meta["fc_pct"] = round(fc_pct * 100, 1)
            meta["fc_known"] = good_cards
            meta["fc_total"] = total_cards
        else:
            fc_pct = 1.0
            meta["fc_pct"] = 100.0

    # ── Quiz component ────────────────────────────────────────────────────────
    if session.quiz_set_id:
        score = await db.scalar(
            select(QuizAttempt.score_pct).where(
                QuizAttempt.quiz_set_id == session.quiz_set_id,
                QuizAttempt.user_id == session.user_id,
                QuizAttempt.status == "completed",
                QuizAttempt.score_pct.isnot(None),
            ).order_by(QuizAttempt.ended_at.desc()).limit(1)
        )
        quiz_pct = float(score) / 100.0 if score is not None else 0.0
        meta["quiz_pct"] = round(quiz_pct * 100, 1)

    # ── Combine ───────────────────────────────────────────────────────────────
    if fc_pct is not None and quiz_pct is not None:
        combined = 0.6 * fc_pct + 0.4 * quiz_pct
    elif fc_pct is not None:
        combined = fc_pct
    elif quiz_pct is not None:
        combined = quiz_pct
    else:
        combined = 1.0 if session.status == "completed" else 0.0

    meta["session_status"] = session.status
    return round(combined * 100, 2), meta


# ── Public entry points ───────────────────────────────────────────────────────

async def update_session_progress(
    session_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession,
    source_type: str = "session",
    source_id: Optional[uuid.UUID] = None,
) -> None:
    """Recompute session progress and cascade upward through the hierarchy."""
    session = await db.get(Session, session_id)
    if session is None:
        log.warning("update_session_progress: session %s not found", session_id)
        return

    pct, meta = await _compute_session_pct(session, db)
    await _upsert_snapshot(db, user_id, "session", session_id, pct, meta, source_type, source_id)

    # Find all micro_goals linked to this session
    rows = await db.execute(
        select(SessionMicroGoal.micro_goal_id).where(
            SessionMicroGoal.session_id == session_id
        )
    )
    micro_goal_ids = [r[0] for r in rows.all()]

    # Propagate upward; deduplicate workspaces to avoid redundant recalculations
    # (all micro_goals in a session share the same workspace)
    visited_workspaces: set[uuid.UUID] = set()
    for mg_id in micro_goal_ids:
        ws_id = await propagate_microgoal_progress(
            mg_id, user_id, db, source_type, source_id or session_id
        )
        if ws_id and ws_id not in visited_workspaces:
            visited_workspaces.add(ws_id)
            subject_id = await propagate_workspace_progress(
                ws_id, user_id, db, source_type, source_id or session_id
            )
            if subject_id:
                await propagate_subject_progress(
                    subject_id, user_id, db, source_type, source_id or session_id
                )


async def propagate_microgoal_progress(
    microgoal_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession,
    source_type: str = "session",
    source_id: Optional[uuid.UUID] = None,
) -> Optional[uuid.UUID]:
    """Recompute microgoal progress.  Returns workspace_id for upstream cascade."""
    mg = await db.get(MicroGoal, microgoal_id)
    if mg is None:
        return None

    meta: dict = {"microgoal_status": mg.status}

    if mg.status == "completed":
        pct = 100.0
        meta["reason"] = "explicitly_completed"
    else:
        # Get linked sessions with their weights
        links = await db.execute(
            select(SessionMicroGoal.session_id, SessionMicroGoal.weight).where(
                SessionMicroGoal.micro_goal_id == microgoal_id
            )
        )
        link_rows = links.all()  # [(session_id, weight), …]

        if not link_rows:
            pct = 0.0
            meta["reason"] = "no_linked_sessions"
        else:
            session_ids = [r[0] for r in link_rows]
            weight_map: dict[uuid.UUID, float] = {r[0]: float(r[1]) for r in link_rows}

            # Fetch existing session snapshots for this user (one query)
            snap_map = await get_progress_snapshot_map(db, user_id, "session", session_ids)

            weighted_sum = 0.0
            total_weight = 0.0
            for s_id in session_ids:
                s_pct = snap_map.get(s_id, 0.0)
                w = weight_map.get(s_id, 1.0)
                weighted_sum += s_pct * w
                total_weight += w

            pct = weighted_sum / total_weight if total_weight > 0 else 0.0
            meta["session_count"] = len(session_ids)
            meta["reason"] = "session_weighted_avg"

    await _upsert_snapshot(db, user_id, "micro_goal", microgoal_id, pct, meta, source_type, source_id)
    return mg.workspace_id


async def propagate_workspace_progress(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession,
    source_type: str = "session",
    source_id: Optional[uuid.UUID] = None,
) -> Optional[uuid.UUID]:
    """Average microgoal snapshots → workspace snapshot.  Returns subject_id."""
    workspace = await db.get(Workspace, workspace_id)
    if workspace is None:
        return None

    # Fetch all non-skipped microgoal IDs for this workspace
    mg_ids_result = await db.execute(
        select(MicroGoal.id).where(
            MicroGoal.workspace_id == workspace_id,
            MicroGoal.status != "skipped",
        )
    )
    mg_ids = [r[0] for r in mg_ids_result.all()]

    meta: dict = {"microgoal_count": len(mg_ids)}

    if not mg_ids:
        pct = 100.0 if workspace.status == "completed" else 0.0
        meta["reason"] = "no_active_microgoals"
    else:
        snap_map = await get_progress_snapshot_map(db, user_id, "micro_goal", mg_ids)
        pcts = list(snap_map.values())
        # Microgoals without a snapshot yet count as 0
        pct = sum(pcts) / len(mg_ids)
        meta["snapshot_count"] = len(pcts)
        meta["reason"] = "microgoal_avg"

    await _upsert_snapshot(db, user_id, "workspace", workspace_id, pct, meta, source_type, source_id)
    return workspace.subject_id


async def propagate_subject_progress(
    subject_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession,
    source_type: str = "session",
    source_id: Optional[uuid.UUID] = None,
) -> None:
    """Average workspace snapshots → subject snapshot, then cascade to missions."""
    ws_ids_result = await db.execute(
        select(Workspace.id).where(
            Workspace.subject_id == subject_id,
            Workspace.user_id == user_id,
            Workspace.status != "canceled",
        )
    )
    ws_ids = [r[0] for r in ws_ids_result.all()]

    meta: dict = {"workspace_count": len(ws_ids)}

    if not ws_ids:
        pct = 0.0
        meta["reason"] = "no_active_workspaces"
    else:
        snap_map = await get_progress_snapshot_map(db, user_id, "workspace", ws_ids)
        pcts = list(snap_map.values())
        pct = sum(pcts) / len(ws_ids)
        meta["snapshot_count"] = len(pcts)
        meta["reason"] = "workspace_avg"

    await _upsert_snapshot(db, user_id, "subject", subject_id, pct, meta, source_type, source_id)

    # Propagate to every mission that contains this subject
    bg_ids_result = await db.execute(
        select(BigGoalSubject.big_goal_id).where(
            BigGoalSubject.subject_id == subject_id
        )
    )
    for (bg_id,) in bg_ids_result.all():
        await propagate_mission_progress(bg_id, user_id, db, source_type, source_id)


async def propagate_mission_progress(
    mission_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession,
    source_type: str = "session",
    source_id: Optional[uuid.UUID] = None,
) -> None:
    """Average subject snapshots → mission (BigGoal) snapshot."""
    subject_ids_result = await db.execute(
        select(BigGoalSubject.subject_id).where(
            BigGoalSubject.big_goal_id == mission_id
        )
    )
    subject_ids = [r[0] for r in subject_ids_result.all()]

    meta: dict = {"subject_count": len(subject_ids)}

    if not subject_ids:
        pct = 0.0
        meta["reason"] = "no_subjects"
    else:
        snap_map = await get_progress_snapshot_map(db, user_id, "subject", subject_ids)
        pcts = list(snap_map.values())
        pct = sum(pcts) / len(subject_ids)
        meta["snapshot_count"] = len(pcts)
        meta["reason"] = "subject_avg"

    await _upsert_snapshot(db, user_id, "mission", mission_id, pct, meta, source_type, source_id)


# ── Workspace-level cascade (used by micro_goal router) ──────────────────────

async def cascade_from_workspace(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession,
    source_type: str = "session",
    source_id: Optional[uuid.UUID] = None,
) -> None:
    """Propagate workspace → subject → missions. Used after micro_goal status change."""
    subject_id = await propagate_workspace_progress(
        workspace_id, user_id, db, source_type, source_id
    )
    if subject_id:
        await propagate_subject_progress(subject_id, user_id, db, source_type, source_id)
