"""Unit tests for app.services.progress_service.

Uses AsyncMock to simulate the SQLAlchemy AsyncSession without needing a real
database.  Each test verifies:

  1. session → microgoal propagation
  2. microgoal → workspace propagation
  3. multiple sessions affecting one microgoal
  4. user-specific isolation (different user_ids never share snapshots)
"""
from __future__ import annotations

import uuid
from decimal import Decimal
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio

from app.services import progress_service


# ── Fixture helpers ───────────────────────────────────────────────────────────

def _fake_session(
    *,
    id: uuid.UUID | None = None,
    workspace_id: uuid.UUID | None = None,
    user_id: uuid.UUID | None = None,
    status: str = "active",
    flashcard_deck_id: uuid.UUID | None = None,
    quiz_set_id: uuid.UUID | None = None,
) -> MagicMock:
    s = MagicMock()
    s.id = id or uuid.uuid4()
    s.workspace_id = workspace_id or uuid.uuid4()
    s.user_id = user_id or uuid.uuid4()
    s.status = status
    s.flashcard_deck_id = flashcard_deck_id
    s.quiz_set_id = quiz_set_id
    return s


def _fake_microgoal(
    *,
    id: uuid.UUID | None = None,
    workspace_id: uuid.UUID | None = None,
    status: str = "pending",
) -> MagicMock:
    m = MagicMock()
    m.id = id or uuid.uuid4()
    m.workspace_id = workspace_id or uuid.uuid4()
    m.status = status
    return m


def _fake_workspace(
    *,
    id: uuid.UUID | None = None,
    subject_id: uuid.UUID | None = None,
    status: str = "active",
) -> MagicMock:
    w = MagicMock()
    w.id = id or uuid.uuid4()
    w.subject_id = subject_id or uuid.uuid4()
    w.status = status
    return w


def _make_db(rows_by_call: list[list[Any]]) -> AsyncMock:
    """Build a minimal AsyncSession mock.

    ``rows_by_call`` is a list of row-lists returned in order by successive
    db.execute() calls.  db.scalar() is handled separately and always returns
    the first element of the next row-list if configured.
    """
    db = AsyncMock()

    # execute() → scalars() → all() returns each row-list in sequence
    call_iter = iter(rows_by_call)

    async def execute_side_effect(stmt):
        try:
            rows = next(call_iter)
        except StopIteration:
            rows = []
        result = MagicMock()
        result.all.return_value = rows
        result.scalars.return_value.all.return_value = rows
        return result

    db.execute.side_effect = execute_side_effect
    db.add = MagicMock()
    db.commit = AsyncMock()
    return db


# ── 1. compute_session_pct — no content ───────────────────────────────────────

@pytest.mark.asyncio
async def test_compute_session_pct_no_content_active() -> None:
    """Session with no deck/quiz and status=active → 0%."""
    session = _fake_session(status="active")
    db = AsyncMock()
    db.scalar = AsyncMock(return_value=None)

    pct, meta = await progress_service._compute_session_pct(session, db)

    assert pct == 0.0
    assert meta["session_status"] == "active"


@pytest.mark.asyncio
async def test_compute_session_pct_no_content_completed() -> None:
    """Session with no deck/quiz and status=completed → 100%."""
    session = _fake_session(status="completed")
    db = AsyncMock()
    db.scalar = AsyncMock(return_value=None)

    pct, meta = await progress_service._compute_session_pct(session, db)

    assert pct == 100.0


# ── 2. compute_session_pct — flashcards only ─────────────────────────────────

@pytest.mark.asyncio
async def test_compute_session_pct_flashcards_only() -> None:
    """7 out of 10 cards known → fc_pct=70 → session_pct=70."""
    deck_id = uuid.uuid4()
    session = _fake_session(flashcard_deck_id=deck_id)

    # scalar() calls: total_cards=10, then good_cards=7
    db = AsyncMock()
    db.scalar = AsyncMock(side_effect=[10, 7])

    pct, meta = await progress_service._compute_session_pct(session, db)

    assert pct == pytest.approx(70.0, abs=0.01)
    assert meta["fc_known"] == 7
    assert meta["fc_total"] == 10


# ── 3. compute_session_pct — quiz only ───────────────────────────────────────

@pytest.mark.asyncio
async def test_compute_session_pct_quiz_only() -> None:
    """Quiz score = 80% → session_pct = 80."""
    quiz_id = uuid.uuid4()
    session = _fake_session(quiz_set_id=quiz_id)

    db = AsyncMock()
    db.scalar = AsyncMock(return_value=Decimal("80.00"))

    pct, meta = await progress_service._compute_session_pct(session, db)

    assert pct == pytest.approx(80.0, abs=0.01)
    assert meta["quiz_pct"] == pytest.approx(80.0, abs=0.1)


# ── 4. compute_session_pct — fc + quiz combined ───────────────────────────────

@pytest.mark.asyncio
async def test_compute_session_pct_combined() -> None:
    """fc=100%, quiz=50% → 0.6*100 + 0.4*50 = 80."""
    deck_id = uuid.uuid4()
    quiz_id = uuid.uuid4()
    session = _fake_session(flashcard_deck_id=deck_id, quiz_set_id=quiz_id)

    db = AsyncMock()
    # scalar calls: total_cards=5, good_cards=5, then quiz_score=50
    db.scalar = AsyncMock(side_effect=[5, 5, Decimal("50.00")])

    pct, meta = await progress_service._compute_session_pct(session, db)

    assert pct == pytest.approx(80.0, abs=0.01)


# ── 5. session → microgoal propagation ───────────────────────────────────────

@pytest.mark.asyncio
async def test_session_triggers_microgoal_propagation() -> None:
    """update_session_progress should call propagate_microgoal_progress for each linked micro_goal."""
    user_id = uuid.uuid4()
    session_id = uuid.uuid4()
    mg_id = uuid.uuid4()

    fake_session = _fake_session(id=session_id, user_id=user_id)
    fake_mg = _fake_microgoal(id=mg_id)

    db = AsyncMock()
    db.get = AsyncMock(side_effect=lambda model, pk: {
        (None, session_id): fake_session,
    }.get((None, pk), fake_session))

    db.scalar = AsyncMock(return_value=None)  # no fc/quiz → pct=0

    with (
        patch.object(progress_service, "_upsert_snapshot", new_callable=AsyncMock) as mock_upsert,
        patch.object(progress_service, "propagate_microgoal_progress", new_callable=AsyncMock) as mock_prop,
    ):
        mock_prop.return_value = fake_mg.workspace_id

        # execute() for micro_goal_ids query returns one row
        execute_result = MagicMock()
        execute_result.all.return_value = [(mg_id,)]
        db.execute = AsyncMock(return_value=execute_result)

        await progress_service.update_session_progress(session_id, user_id, db)

    mock_upsert.assert_awaited_once()
    mock_prop.assert_awaited_once_with(
        mg_id, user_id, db, "session", session_id
    )


# ── 6. Multiple sessions → microgoal weighted average ─────────────────────────

@pytest.mark.asyncio
async def test_microgoal_weighted_average_of_sessions() -> None:
    """Two sessions (pct=80, pct=60) with equal weight → microgoal = 70."""
    user_id = uuid.uuid4()
    mg_id = uuid.uuid4()
    ws_id = uuid.uuid4()
    sess1_id = uuid.uuid4()
    sess2_id = uuid.uuid4()

    fake_mg = _fake_microgoal(id=mg_id, workspace_id=ws_id, status="in_progress")

    db = AsyncMock()
    db.get = AsyncMock(return_value=fake_mg)

    # execute call 1: session links — two rows (session_id, weight)
    # execute call 2: snapshot query — two rows (entity_id, progress_pct)
    call_index = 0
    async def execute_side(stmt):
        nonlocal call_index
        result = MagicMock()
        if call_index == 0:
            result.all.return_value = [(sess1_id, Decimal("1.0")), (sess2_id, Decimal("1.0"))]
        else:
            result.all.return_value = [
                (sess1_id, Decimal("80.00")),
                (sess2_id, Decimal("60.00")),
            ]
        call_index += 1
        return result

    db.execute = execute_side

    with patch.object(progress_service, "_upsert_snapshot", new_callable=AsyncMock) as mock_upsert:
        result = await progress_service.propagate_microgoal_progress(mg_id, user_id, db)

    assert result == ws_id
    mock_upsert.assert_awaited_once()
    _, kwargs = mock_upsert.call_args if mock_upsert.call_args else ([], {})
    # positional args: db, user_id, entity_type, entity_id, pct, meta, source_type, source_id
    args = mock_upsert.call_args.args
    assert args[4] == pytest.approx(70.0, abs=0.01)


# ── 7. Completed microgoal → 100% regardless of sessions ─────────────────────

@pytest.mark.asyncio
async def test_completed_microgoal_returns_100() -> None:
    """A microgoal with status=completed should snapshot as 100%."""
    user_id = uuid.uuid4()
    mg_id = uuid.uuid4()
    ws_id = uuid.uuid4()

    fake_mg = _fake_microgoal(id=mg_id, workspace_id=ws_id, status="completed")

    db = AsyncMock()
    db.get = AsyncMock(return_value=fake_mg)
    db.execute = AsyncMock()  # should not be called

    with patch.object(progress_service, "_upsert_snapshot", new_callable=AsyncMock) as mock_upsert:
        await progress_service.propagate_microgoal_progress(mg_id, user_id, db)

    args = mock_upsert.call_args.args
    assert args[4] == 100.0
    db.execute.assert_not_called()


# ── 8. microgoal → workspace propagation ─────────────────────────────────────

@pytest.mark.asyncio
async def test_microgoal_propagates_to_workspace() -> None:
    """propagate_workspace_progress averages microgoal snapshots."""
    user_id = uuid.uuid4()
    ws_id = uuid.uuid4()
    mg1_id = uuid.uuid4()
    mg2_id = uuid.uuid4()
    subject_id = uuid.uuid4()

    fake_ws = _fake_workspace(id=ws_id, subject_id=subject_id)
    db = AsyncMock()
    db.get = AsyncMock(return_value=fake_ws)

    call_index = 0
    async def execute_side(stmt):
        nonlocal call_index
        result = MagicMock()
        if call_index == 0:
            # microgoal IDs query
            result.all.return_value = [(mg1_id,), (mg2_id,)]
        else:
            # snapshot query: mg1=90, mg2=70
            result.all.return_value = [
                (mg1_id, Decimal("90.00")),
                (mg2_id, Decimal("70.00")),
            ]
        call_index += 1
        return result

    db.execute = execute_side

    with patch.object(progress_service, "_upsert_snapshot", new_callable=AsyncMock) as mock_upsert:
        result = await progress_service.propagate_workspace_progress(ws_id, user_id, db)

    assert result == subject_id
    args = mock_upsert.call_args.args
    assert args[4] == pytest.approx(80.0, abs=0.01)


# ── 9. User-specific isolation ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_user_isolation_in_snapshots() -> None:
    """Snapshots for user_A must not affect user_B computations."""
    user_a = uuid.uuid4()
    user_b = uuid.uuid4()
    session_id = uuid.uuid4()

    session_a = _fake_session(id=session_id, user_id=user_a, status="completed")
    session_b = _fake_session(id=session_id, user_id=user_b, status="active")

    captured: dict[uuid.UUID, float] = {}

    async def fake_upsert(db, user_id, entity_type, entity_id, pct, meta, src_type, src_id):
        captured[user_id] = pct

    with patch.object(progress_service, "_upsert_snapshot", side_effect=fake_upsert):
        # Run for user_a: completed session, no content → 100
        db_a = AsyncMock()
        db_a.get = AsyncMock(return_value=session_a)
        db_a.scalar = AsyncMock(return_value=None)
        db_a.execute = AsyncMock(return_value=MagicMock(**{"all.return_value": []}))
        await progress_service.update_session_progress(session_id, user_a, db_a)

        # Run for user_b: active session, no content → 0
        db_b = AsyncMock()
        db_b.get = AsyncMock(return_value=session_b)
        db_b.scalar = AsyncMock(return_value=None)
        db_b.execute = AsyncMock(return_value=MagicMock(**{"all.return_value": []}))
        await progress_service.update_session_progress(session_id, user_b, db_b)

    assert captured[user_a] == 100.0
    assert captured[user_b] == 0.0
    assert captured[user_a] != captured[user_b]


# ── 10. workspace → subject propagation ──────────────────────────────────────

@pytest.mark.asyncio
async def test_workspace_propagates_to_subject_then_missions() -> None:
    """propagate_subject_progress calls propagate_mission_progress for each mission."""
    user_id = uuid.uuid4()
    subject_id = uuid.uuid4()
    ws_id = uuid.uuid4()
    mission_id = uuid.uuid4()

    call_index = 0
    async def execute_side(stmt):
        nonlocal call_index
        result = MagicMock()
        if call_index == 0:
            # workspace IDs
            result.all.return_value = [(ws_id,)]
        elif call_index == 1:
            # workspace snapshots: 75%
            result.all.return_value = [(ws_id, Decimal("75.00"))]
        else:
            # big_goal_subjects query
            result.all.return_value = [(mission_id,)]
        call_index += 1
        return result

    db = AsyncMock()
    db.execute = execute_side

    with (
        patch.object(progress_service, "_upsert_snapshot", new_callable=AsyncMock),
        patch.object(progress_service, "propagate_mission_progress", new_callable=AsyncMock) as mock_mission,
    ):
        await progress_service.propagate_subject_progress(subject_id, user_id, db)

    mock_mission.assert_awaited_once_with(
        mission_id, user_id, db, "session", None
    )
