"""FastAPI application entry point: registers routers, middleware, and startup hooks."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text

import app.models  # noqa: F401 — registers all ORM models before create_all
from app.core.config import get_settings
from app.core.limiter import limiter
from app.core.db_setup import Base, engine
from app.core.migrations import run_pre_migrations, run_post_migrations
from app.api.v1.routers.auth.auth import router as auth_router
from app.api.v1.routers.user import router as user_router
from app.api.v1.routers.subjects import router as subjects_router
from app.api.v1.routers.big_goals import router as big_goals_router
from app.api.v1.routers.workspaces import router as workspaces_router
from app.api.v1.routers.documents import router as documents_router
from app.api.v1.routers.micro_goals import router as micro_goals_router
from app.api.v1.routers.sessions import router as sessions_router
from app.api.v1.routers.ai_jobs import router as ai_jobs_router
from app.api.v1.routers.ai_chat import router as ai_chat_router
from app.api.v1.routers.flashcard_decks import router as flashcard_decks_router
from app.api.v1.routers.flashcards import router as flashcard_reviews_router
from app.api.v1.routers.quiz_sets import router as quiz_sets_router
from app.api.v1.routers.notes import router as notes_router
from app.api.v1.routers.dashboard import router as dashboard_router

PREFIX = "/api/v1"

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    await run_pre_migrations(engine)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(text("SELECT 1"))  # verify connectivity
    await run_post_migrations(engine)
    logger.info("Database ready (env=%s)", settings.environment)
    yield
    await engine.dispose()


app = FastAPI(
    lifespan=lifespan,
    title="Study Buddy API",
    description="AI-Powered Study Assistant",
    version="1.0.0",
    # Hide docs in production to avoid leaking schema information
    docs_url="/docs" if get_settings().environment == "dev" else None,
    redoc_url="/redoc" if get_settings().environment == "dev" else None,
)

# ── Rate limiter — attach to app so slowapi middleware can find it ────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Security headers middleware ───────────────────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    if get_settings().environment != "dev":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# ── CORS ─────────────────────────────────────────────────────────────────────
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth_router, prefix=PREFIX)
app.include_router(user_router, prefix=PREFIX)
app.include_router(subjects_router, prefix=PREFIX)
app.include_router(big_goals_router, prefix=PREFIX)
app.include_router(workspaces_router, prefix=PREFIX)
app.include_router(documents_router, prefix=PREFIX)
app.include_router(micro_goals_router, prefix=PREFIX)
app.include_router(sessions_router, prefix=PREFIX)
app.include_router(ai_jobs_router, prefix=PREFIX)
app.include_router(ai_chat_router, prefix=PREFIX)
app.include_router(flashcard_decks_router, prefix=PREFIX)
app.include_router(flashcard_reviews_router, prefix=PREFIX)
app.include_router(quiz_sets_router, prefix=PREFIX)
app.include_router(notes_router, prefix=PREFIX)
app.include_router(dashboard_router, prefix=PREFIX)


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}
