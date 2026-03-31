"""Baseline: absorbs all pre-Alembic schema additions from migrations.py.

Every statement uses IF NOT EXISTS / DO-block guards so it is fully idempotent:
  - Fresh installs: create_all() already applied these via the ORM models → no-ops.
  - Existing installs that ran the old migrations.py → no-ops.
  - Existing installs that never ran migrations.py (unlikely) → applies them.

Revision ID: 0001
Revises:
Create Date: 2026-01-01 00:00:00.000000
"""
from __future__ import annotations

from alembic import op

revision: str = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── PRE_CREATE (ran before create_all in old system) ──────────────────────
    op.execute(
        "ALTER TABLE tokens ADD COLUMN IF NOT EXISTS "
        "token_type VARCHAR(10) NOT NULL DEFAULT 'access'"
    )

    # ── POST_CREATE (ran after create_all in old system) ─────────────────────
    op.execute(
        "ALTER TABLE big_goals ADD COLUMN IF NOT EXISTS "
        "cover_color VARCHAR(20) NOT NULL DEFAULT '#6366f1'"
    )
    op.execute("ALTER TABLE big_goals ADD COLUMN IF NOT EXISTS icon VARCHAR(100)")
    op.execute(
        "ALTER TABLE big_goals ADD COLUMN IF NOT EXISTS "
        "pinned BOOLEAN NOT NULL DEFAULT false"
    )
    op.execute(
        "ALTER TABLE big_goals ADD COLUMN IF NOT EXISTS "
        "archived BOOLEAN NOT NULL DEFAULT false"
    )
    op.execute(
        "ALTER TABLE big_goals ADD COLUMN IF NOT EXISTS "
        "display_order INTEGER NOT NULL DEFAULT 0"
    )
    op.execute(
        "ALTER TABLE notes ADD COLUMN IF NOT EXISTS "
        "canvas_enabled BOOLEAN NOT NULL DEFAULT false"
    )
    op.execute(
        "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS "
        "flashcard_deck_id UUID REFERENCES flashcard_decks(id) ON DELETE SET NULL"
    )
    op.execute(
        "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS "
        "quiz_set_id UUID REFERENCES quiz_sets(id) ON DELETE SET NULL"
    )
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_prompt_active_name_role
        ON prompts (name, role)
        WHERE is_active = TRUE
    """)
    op.execute(
        "ALTER TABLE micro_goals ADD COLUMN IF NOT EXISTS "
        "source VARCHAR(10) NOT NULL DEFAULT 'user'"
    )
    op.execute("""
        UPDATE micro_goals SET source = 'system'
        WHERE source = 'user'
          AND (title ~ '^Read summary:'
               OR title ~ '^Study flashcards:'
               OR title ~ '^Pass quiz:'
               OR title = 'Apply knowledge')
    """)
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_pipeline_run_workspace_task_null
        ON pipeline_runs (workspace_id, task_name)
        WHERE document_id IS NULL
    """)


def downgrade() -> None:
    # Baseline migration — rollback not defined.
    pass
