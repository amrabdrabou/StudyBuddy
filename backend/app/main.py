"""FastAPI application entry point: registers routers, middleware, and startup hooks."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

import app.models  # noqa: F401 — registers all ORM models before create_all
from app.core.db_setup import Base, engine
from app.core.migrations import run_pre_migrations, run_post_migrations
from app.api.v1.routers.auth.auth import router as auth_router
from app.api.v1.routers.user import router as user_router
from app.api.v1.routers.notes import router as notes_router
from app.api.v1.routers.subjects import router as subjects_router
from app.api.v1.routers.sessions import router as sessions_router
from app.api.v1.routers.session_participants import router as session_participants_router
from app.api.v1.routers.session_documents import router as session_documents_router
from app.api.v1.routers.document_topics import router as document_topics_router
from app.api.v1.routers.session_topics import router as session_topics_router
from app.api.v1.routers.micro_goals import router as micro_goals_router
from app.api.v1.routers.session_ai_events import router as session_ai_events_router
from app.api.v1.routers.quiz import router as quiz_router
from app.api.v1.routers.session_reflections import router as session_reflections_router
from app.api.v1.routers.session_recommendations import router as session_recommendations_router
from app.api.v1.routers.learning_goals import router as learning_goals_router
from app.api.v1.routers.quiz_sets import router as quiz_sets_router
from app.api.v1.routers.timeline import router as timeline_router
from app.api.v1.routers.ai_recommendations import router as ai_recommendations_router
from app.api.v1.routers.progress import router as progress_router
from app.api.v1.routers.dashboard import router as dashboard_router

PREFIX = "/api/v1"

@asynccontextmanager
async def lifespan(app: FastAPI):
    await run_pre_migrations(engine)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(text("SELECT 1"))  # verify connectivity
    await run_post_migrations(engine)
    print("Database ready")

    yield

    await engine.dispose()


app = FastAPI(
    lifespan=lifespan,
    title="Study Buddy API",
    description="AI-Powered Study Assistant",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix=PREFIX)
app.include_router(user_router, prefix=PREFIX)
app.include_router(notes_router, prefix=PREFIX)
app.include_router(subjects_router, prefix=PREFIX)
app.include_router(sessions_router, prefix=PREFIX)
app.include_router(session_participants_router, prefix=PREFIX)
app.include_router(session_documents_router, prefix=PREFIX)
app.include_router(document_topics_router, prefix=PREFIX)
app.include_router(session_topics_router, prefix=PREFIX)
app.include_router(micro_goals_router, prefix=PREFIX)
app.include_router(session_ai_events_router, prefix=PREFIX)
app.include_router(quiz_router, prefix=PREFIX)
app.include_router(session_reflections_router, prefix=PREFIX)
app.include_router(session_recommendations_router, prefix=PREFIX)
app.include_router(learning_goals_router, prefix=PREFIX)
app.include_router(quiz_sets_router, prefix=PREFIX)
app.include_router(timeline_router, prefix=PREFIX)
app.include_router(ai_recommendations_router, prefix=PREFIX)
app.include_router(progress_router, prefix=PREFIX)
app.include_router(dashboard_router, prefix=PREFIX)


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}
