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
    # Add indexes that reference newly created tables here, e.g.:
    # "CREATE INDEX IF NOT EXISTS idx_foo ON bar(baz)",
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
