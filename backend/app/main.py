from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

import uuid

import app.models  # noqa: F401 — registers all models in metadata before create_all
from app.core.db_setup import Base, AsyncSessionLocal, engine
from app.models.user import User
from app.api.v1.routers.auth.auth import router as auth_router
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

# Fixed UUID used as a placeholder owner until auth is wired up
DEV_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(text("SELECT 1"))
    print("Database connected")

    # Seed a dev user so notes have a valid owner FK
    async with AsyncSessionLocal() as session:
        from sqlalchemy import select
        result = await session.execute(select(User).where(User.id == DEV_USER_ID))
        if result.scalar_one_or_none() is None:
            session.add(User(
                id=DEV_USER_ID,
                email="dev@studybuddy.local",
                username="dev",
                auth_provider="local",
            ))
            await session.commit()
            print("Dev user seeded")

    yield

    await engine.dispose()
    print("Database connection closed")


app = FastAPI(
    lifespan=lifespan,
    title="Study Buddy",
    description="AI-Powered Study Assistant",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1")
app.include_router(notes_router, prefix="/api/v1")
app.include_router(subjects_router, prefix="/api/v1")
app.include_router(sessions_router, prefix="/api/v1")
app.include_router(session_participants_router, prefix="/api/v1")
app.include_router(session_documents_router, prefix="/api/v1")
app.include_router(document_topics_router, prefix="/api/v1")
app.include_router(session_topics_router, prefix="/api/v1")
app.include_router(micro_goals_router, prefix="/api/v1")
app.include_router(session_ai_events_router, prefix="/api/v1")
app.include_router(quiz_router, prefix="/api/v1")
app.include_router(session_reflections_router, prefix="/api/v1")
app.include_router(session_recommendations_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"message": "Welcome to Study Buddy API!"}
