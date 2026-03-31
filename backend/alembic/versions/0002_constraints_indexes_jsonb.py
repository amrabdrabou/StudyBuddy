"""Add CHECK constraints, composite indexes, and migrate text blobs to JSONB.

CHECK constraints use DO-blocks so they are idempotent (won't fail on re-run).
Indexes use CREATE INDEX IF NOT EXISTS.
JSONB column changes check the current column type before altering.

Revision ID: 0002
Revises: 0001
Create Date: 2026-01-01 00:00:01.000000
"""
from __future__ import annotations

from alembic import op

revision: str = "0002"
down_revision: str = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── CHECK constraints ─────────────────────────────────────────────────────
    # Each block catches duplicate_object so re-running is safe.

    op.execute("""
        DO $$ BEGIN
            ALTER TABLE workspaces ADD CONSTRAINT chk_workspaces_status
                CHECK (status IN ('active', 'paused', 'completed', 'canceled'));
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)

    op.execute("""
        DO $$ BEGIN
            ALTER TABLE big_goals ADD CONSTRAINT chk_big_goals_status
                CHECK (status IN (
                    'active', 'paused', 'overdue',
                    'ready_to_complete', 'completed', 'canceled'
                ));
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)

    op.execute("""
        DO $$ BEGIN
            ALTER TABLE documents ADD CONSTRAINT chk_documents_status
                CHECK (status IN ('uploaded', 'processing', 'ready', 'failed'));
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)

    op.execute("""
        DO $$ BEGIN
            ALTER TABLE sessions ADD CONSTRAINT chk_sessions_status
                CHECK (status IN ('active', 'paused', 'completed', 'abandoned'));
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)

    op.execute("""
        DO $$ BEGIN
            ALTER TABLE micro_goals ADD CONSTRAINT chk_micro_goals_status
                CHECK (status IN (
                    'suggested', 'pending', 'in_progress', 'completed', 'skipped'
                ));
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)

    op.execute("""
        DO $$ BEGIN
            ALTER TABLE micro_goals ADD CONSTRAINT chk_micro_goals_source
                CHECK (source IN ('system', 'ai', 'user'));
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)

    op.execute("""
        DO $$ BEGIN
            ALTER TABLE quiz_attempts ADD CONSTRAINT chk_quiz_attempts_status
                CHECK (status IN (
                    'in_progress', 'completed', 'abandoned', 'timed_out'
                ));
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)

    op.execute("""
        DO $$ BEGIN
            ALTER TABLE ai_jobs ADD CONSTRAINT chk_ai_jobs_status
                CHECK (status IN (
                    'queued', 'running', 'completed', 'partial', 'failed', 'canceled'
                ));
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)

    op.execute("""
        DO $$ BEGIN
            ALTER TABLE pipeline_runs ADD CONSTRAINT chk_pipeline_runs_status
                CHECK (status IN (
                    'pending', 'running', 'completed', 'failed', 'skipped'
                ));
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)

    # ── Composite indexes ─────────────────────────────────────────────────────
    # Dashboard: user's goals by status
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_workspaces_user_status "
        "ON workspaces (user_id, status)"
    )
    # Ordered goal list with status filter (the most common workspace query)
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_micro_goals_ws_status_order "
        "ON micro_goals (workspace_id, status, order_index)"
    )
    # Pipeline status check + document listing
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_documents_ws_status_created "
        "ON documents (workspace_id, status, created_at)"
    )
    # Session history for a user in a workspace
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_sessions_ws_user_started "
        "ON sessions (workspace_id, user_id, started_at)"
    )
    # Notes by subject, recently updated first
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_notes_user_subject_updated "
        "ON notes (user_id, subject_id, updated_at)"
    )
    # Active quiz attempts check
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_quiz_attempts_quiz_user_status "
        "ON quiz_attempts (quiz_set_id, user_id, status)"
    )

    # ── Text → JSONB column migrations ───────────────────────────────────────
    # Each DO block checks the current column type first so the migration is
    # idempotent (fresh installs have JSONB from create_all; this is a no-op).

    op.execute("""
        DO $$ BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'ai_jobs'
                  AND column_name = 'result_json'
                  AND data_type = 'text'
            ) THEN
                ALTER TABLE ai_jobs
                    ALTER COLUMN result_json TYPE JSONB
                    USING CASE
                        WHEN result_json IS NULL THEN NULL
                        ELSE result_json::jsonb
                    END;
            END IF;
        END $$
    """)

    op.execute("""
        DO $$ BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'llm_logs'
                  AND column_name = 'full_prompt'
                  AND data_type = 'text'
            ) THEN
                ALTER TABLE llm_logs
                    ALTER COLUMN full_prompt TYPE JSONB
                    USING full_prompt::jsonb;
            END IF;
        END $$
    """)

    op.execute("""
        DO $$ BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'document_contents'
                  AND column_name = 'pages_json'
                  AND data_type = 'text'
            ) THEN
                ALTER TABLE document_contents
                    ALTER COLUMN pages_json TYPE JSONB
                    USING CASE
                        WHEN pages_json IS NULL THEN NULL
                        ELSE pages_json::jsonb
                    END;
            END IF;
        END $$
    """)


def downgrade() -> None:
    # ── JSONB → Text ──────────────────────────────────────────────────────────
    op.execute("""
        ALTER TABLE document_contents
            ALTER COLUMN pages_json TYPE TEXT
            USING pages_json::text
    """)
    op.execute("""
        ALTER TABLE llm_logs
            ALTER COLUMN full_prompt TYPE TEXT
            USING full_prompt::text
    """)
    op.execute("""
        ALTER TABLE ai_jobs
            ALTER COLUMN result_json TYPE TEXT
            USING result_json::text
    """)

    # ── Drop composite indexes ────────────────────────────────────────────────
    op.execute("DROP INDEX IF EXISTS ix_quiz_attempts_quiz_user_status")
    op.execute("DROP INDEX IF EXISTS ix_notes_user_subject_updated")
    op.execute("DROP INDEX IF EXISTS ix_sessions_ws_user_started")
    op.execute("DROP INDEX IF EXISTS ix_documents_ws_status_created")
    op.execute("DROP INDEX IF EXISTS ix_micro_goals_ws_status_order")
    op.execute("DROP INDEX IF EXISTS ix_workspaces_user_status")

    # ── Drop CHECK constraints ────────────────────────────────────────────────
    op.execute("ALTER TABLE pipeline_runs DROP CONSTRAINT IF EXISTS chk_pipeline_runs_status")
    op.execute("ALTER TABLE ai_jobs DROP CONSTRAINT IF EXISTS chk_ai_jobs_status")
    op.execute("ALTER TABLE quiz_attempts DROP CONSTRAINT IF EXISTS chk_quiz_attempts_status")
    op.execute("ALTER TABLE micro_goals DROP CONSTRAINT IF EXISTS chk_micro_goals_source")
    op.execute("ALTER TABLE micro_goals DROP CONSTRAINT IF EXISTS chk_micro_goals_status")
    op.execute("ALTER TABLE sessions DROP CONSTRAINT IF EXISTS chk_sessions_status")
    op.execute("ALTER TABLE documents DROP CONSTRAINT IF EXISTS chk_documents_status")
    op.execute("ALTER TABLE big_goals DROP CONSTRAINT IF EXISTS chk_big_goals_status")
    op.execute("ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS chk_workspaces_status")
