"""
Startup migrations for adding columns or indexes that can't be expressed
via create_all alone (e.g. columns on already-existing tables).
Each statement runs in its own transaction so one failure doesn't abort the rest.
"""
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine


PRE_CREATE: list[str] = [
    # Security: token_type distinguishes access vs. refresh tokens
    "ALTER TABLE tokens ADD COLUMN IF NOT EXISTS token_type VARCHAR(10) NOT NULL DEFAULT 'access'",
]

POST_CREATE: list[str] = [
    # Mission card fields on big_goals
    "ALTER TABLE big_goals ADD COLUMN IF NOT EXISTS cover_color VARCHAR(20) NOT NULL DEFAULT '#6366f1'",
    "ALTER TABLE big_goals ADD COLUMN IF NOT EXISTS icon VARCHAR(100)",
    "ALTER TABLE big_goals ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false",
    "ALTER TABLE big_goals ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false",
    "ALTER TABLE big_goals ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0",
    # Canvas editor flag on notes
    "ALTER TABLE notes ADD COLUMN IF NOT EXISTS canvas_enabled BOOLEAN NOT NULL DEFAULT false",
]


async def _run_batch(engine: AsyncEngine, statements: list[str], label: str) -> None:
    """
    Executes a list of raw SQL statements asynchronously.
    Catches and logs exceptions individually, allowing the application
    to continue starting up even if a minor statement fails.
    """
    for statement in statements:
        try:
            async with engine.begin() as conn:
                await conn.execute(text(statement))
        except Exception as exc:
            print(f"[migration:{label}] warning — {type(exc).__name__}: {statement.strip()[:80]}")


async def run_pre_migrations(engine: AsyncEngine) -> None:
    """Execute SQL statements configured to run before table creation."""
    await _run_batch(engine, PRE_CREATE, "pre")


async def run_post_migrations(engine: AsyncEngine) -> None:
    """Execute SQL statements configured to run after table creation."""
    await _run_batch(engine, POST_CREATE, "post")
