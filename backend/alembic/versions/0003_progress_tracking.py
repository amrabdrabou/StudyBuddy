"""Progress tracking: progress_snapshots, progress_events, session_micro_goal.weight.

Revision ID: 0003
Revises: 0002
Create Date: 2026-03-30 00:00:00.000000

All statements use IF NOT EXISTS guards so the migration is idempotent —
safe to run on both fresh and existing databases.
"""
from __future__ import annotations

from alembic import op

revision: str = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. Add weight column to session_micro_goals ───────────────────────────
    op.execute("""
        ALTER TABLE session_micro_goals
        ADD COLUMN IF NOT EXISTS weight NUMERIC(5,4) NOT NULL DEFAULT 1.0
    """)

    # ── 2. Create progress_snapshots table ────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS progress_snapshots (
            id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id       UUID NOT NULL,
            entity_type   VARCHAR(20) NOT NULL,
            entity_id     UUID NOT NULL,
            progress_pct  NUMERIC(5,2) NOT NULL DEFAULT 0.0,
            metadata_json JSONB,
            computed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

            CONSTRAINT uq_progress_snapshot_user_entity
                UNIQUE (user_id, entity_type, entity_id)
        )
    """)

    # ── Indexes for progress_snapshots ────────────────────────────────────────
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_progress_snapshots_lookup
        ON progress_snapshots (user_id, entity_type, entity_id)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_progress_snapshots_entity
        ON progress_snapshots (entity_type, entity_id)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_progress_snapshots_user_id
        ON progress_snapshots (user_id)
    """)

    # ── 3. Create progress_events table ───────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS progress_events (
            id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id           UUID NOT NULL,
            entity_type       VARCHAR(20) NOT NULL,
            entity_id         UUID NOT NULL,
            source_type       VARCHAR(20) NOT NULL,
            source_id         UUID,
            old_progress_pct  NUMERIC(5,2) NOT NULL DEFAULT 0.0,
            new_progress_pct  NUMERIC(5,2) NOT NULL DEFAULT 0.0,
            delta_progress    NUMERIC(6,2) NOT NULL DEFAULT 0.0,
            metadata_json     JSONB,
            created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)

    # ── Indexes for progress_events ───────────────────────────────────────────
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_progress_events_user_entity
        ON progress_events (user_id, entity_type, entity_id)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_progress_events_timeline
        ON progress_events (user_id, created_at)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_progress_events_user_id
        ON progress_events (user_id)
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS progress_events")
    op.execute("DROP TABLE IF EXISTS progress_snapshots")
    op.execute("""
        ALTER TABLE session_micro_goals
        DROP COLUMN IF EXISTS weight
    """)
