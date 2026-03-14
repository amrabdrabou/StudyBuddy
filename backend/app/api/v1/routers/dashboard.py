"""
Dashboard aggregate endpoint.
Returns a single JSON object with all widgets needed to render the dashboard.
All data comes from precomputed tables — no live aggregations.
"""
from datetime import date, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.core.db_setup import get_db
from app.models.ai_recommendation import AiRecommendation
from app.models.learning_goal import LearningGoal
from app.models.progress_snapshot import ProgressSnapshot
from app.models.study_session import StudySession
from app.models.timeline_event import TimelineEvent
from app.models.user import User
from app.schema.ai_recommendation import AiRecommendationResponse
from app.schema.learning_goal import LearningGoalResponse
from app.schema.progress_snapshot import ProgressSnapshotResponse
from app.schema.study_session import StudySessionResponse
from app.schema.timeline_event import TimelineEventResponse

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/")
async def get_dashboard(
    days: int = Query(7, ge=1, le=90, description="Days of history for recent sessions/events"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    All-in-one dashboard payload. Fetches:
    - Active learning goals
    - Recent study sessions
    - Latest daily progress snapshots (last `days`)
    - Active AI recommendations
    - Recent timeline events
    - Simple summary stats
    """
    uid = current_user.id
    since = date.today() - timedelta(days=days)

    # Active learning goals
    goals_result = await db.execute(
        select(LearningGoal)
        .where(LearningGoal.user_id == uid, LearningGoal.status == "active")
        .order_by(LearningGoal.created_at.desc())
        .limit(10)
    )
    goals = goals_result.scalars().all()

    # Recent sessions
    sessions_result = await db.execute(
        select(StudySession)
        .where(StudySession.user_id == uid)
        .order_by(StudySession.created_at.desc())
        .limit(10)
    )
    sessions = sessions_result.scalars().all()

    # Daily snapshots for the period
    snapshots_result = await db.execute(
        select(ProgressSnapshot)
        .where(
            ProgressSnapshot.user_id == uid,
            ProgressSnapshot.snapshot_type == "daily",
            ProgressSnapshot.snapshot_date >= since,
        )
        .order_by(ProgressSnapshot.snapshot_date.desc())
    )
    snapshots = snapshots_result.scalars().all()

    # Active (non-dismissed) AI recommendations
    recs_result = await db.execute(
        select(AiRecommendation)
        .where(AiRecommendation.user_id == uid, AiRecommendation.is_dismissed == False)  # noqa: E712
        .order_by(AiRecommendation.created_at.desc())
        .limit(5)
    )
    recommendations = recs_result.scalars().all()

    # Recent timeline events
    events_result = await db.execute(
        select(TimelineEvent)
        .where(TimelineEvent.user_id == uid)
        .order_by(TimelineEvent.created_at.desc())
        .limit(20)
    )
    events = events_result.scalars().all()

    # Aggregate stats from snapshots
    total_minutes = sum(s.total_study_minutes for s in snapshots)
    total_sessions = sum(s.sessions_completed for s in snapshots)

    return {
        "summary": {
            "total_study_minutes_period": total_minutes,
            "total_sessions_period": total_sessions,
            "active_goals_count": len(goals),
        },
        "active_goals": [LearningGoalResponse.model_validate(g) for g in goals],
        "recent_sessions": [StudySessionResponse.model_validate(s) for s in sessions],
        "daily_snapshots": [ProgressSnapshotResponse.model_validate(s) for s in snapshots],
        "recommendations": [AiRecommendationResponse.model_validate(r) for r in recommendations],
        "recent_events": [TimelineEventResponse.model_validate(e) for e in events],
    }


@router.get("/stats")
async def get_stats(
    learning_goal_id: UUID | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Aggregated stats from progress_snapshots for a given date range / goal."""
    uid = current_user.id
    query = select(ProgressSnapshot).where(ProgressSnapshot.user_id == uid)
    if learning_goal_id:
        query = query.where(ProgressSnapshot.learning_goal_id == learning_goal_id)
    if from_date:
        query = query.where(ProgressSnapshot.snapshot_date >= from_date)
    if to_date:
        query = query.where(ProgressSnapshot.snapshot_date <= to_date)

    result = await db.execute(query)
    snapshots = result.scalars().all()

    if not snapshots:
        return {
            "total_study_minutes": 0,
            "sessions_completed": 0,
            "micro_goals_completed": 0,
            "quiz_attempts_count": 0,
            "quiz_avg_score_pct": None,
            "flashcards_reviewed": 0,
            "documents_processed": 0,
        }

    scored = [s.quiz_avg_score_pct for s in snapshots if s.quiz_avg_score_pct is not None]
    avg_score = sum(float(x) for x in scored) / len(scored) if scored else None

    return {
        "total_study_minutes": sum(s.total_study_minutes for s in snapshots),
        "sessions_completed": sum(s.sessions_completed for s in snapshots),
        "micro_goals_completed": sum(s.micro_goals_completed for s in snapshots),
        "quiz_attempts_count": sum(s.quiz_attempts_count for s in snapshots),
        "quiz_avg_score_pct": round(avg_score, 2) if avg_score is not None else None,
        "flashcards_reviewed": sum(s.flashcards_reviewed for s in snapshots),
        "documents_processed": sum(s.documents_processed for s in snapshots),
    }
