"""
Dashboard aggregate endpoint.
Returns a single JSON object with all widgets needed to render the dashboard.
All data comes from precomputed tables — no live aggregations.
"""
from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_active_user
from app.core.db_setup import get_db
from app.models.ai_recommendation import AiRecommendation
from app.models.flashcard import Flashcard
from app.models.flashcard_deck import FlashcardDeck
from app.models.learning_goal import LearningGoal
from app.models.progress_snapshot import ProgressSnapshot
from app.models.quiz_attempt import QuizAttempt
from app.models.study_group import StudyGroup
from app.models.study_group_member import StudyGroupMember
from app.models.study_session import StudySession
from app.models.timeline_event import TimelineEvent
from app.models.user import User
from app.schema.ai_recommendation import AiRecommendationResponse
from app.schema.flashcard import FlashcardResponse
from app.schema.learning_goal import LearningGoalResponse
from app.schema.progress_snapshot import ProgressSnapshotResponse
from app.schema.quiz_attempt import QuizAttemptResponse
from app.schema.study_group import StudyGroupResponse
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
        "user": {
            "full_name": current_user.full_name,
            "username": current_user.username,
            "email": current_user.email,
            "auth_provider": current_user.auth_provider,
        },
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


@router.get("/last-session")
async def get_last_session(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the most recent session the user can resume (active/pending first),
    falling back to the last completed session. Used by the 'Continue Session' widget.
    """
    uid = current_user.id

    # First, prefer an in-progress session
    active_result = await db.execute(
        select(StudySession)
        .where(
            StudySession.user_id == uid,
            StudySession.status.in_(["active", "pending"]),
        )
        .order_by(StudySession.updated_at.desc())
        .limit(1)
    )
    session = active_result.scalar_one_or_none()

    # Fallback: most recent completed session
    if session is None:
        completed_result = await db.execute(
            select(StudySession)
            .where(StudySession.user_id == uid, StudySession.status == "completed")
            .order_by(StudySession.ended_at.desc())
            .limit(1)
        )
        session = completed_result.scalar_one_or_none()

    return {
        "session": StudySessionResponse.model_validate(session) if session else None,
    }


@router.get("/flashcards-due")
async def get_flashcards_due(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns flashcards that are due for review (next_review_date <= now).
    Scoped to the current user's decks. Used by the 'Flashcards Due' widget.
    """
    uid = current_user.id
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(Flashcard)
        .join(FlashcardDeck, Flashcard.deck_id == FlashcardDeck.id)
        .where(
            FlashcardDeck.user_id == uid,
            Flashcard.next_review_date <= now,
            Flashcard.is_archived == False,  # noqa: E712
        )
        .order_by(Flashcard.next_review_date.asc())
        .limit(limit)
    )
    cards = result.scalars().all()

    # Total count (may exceed `limit`)
    count_result = await db.execute(
        select(func.count(Flashcard.id))
        .join(FlashcardDeck, Flashcard.deck_id == FlashcardDeck.id)
        .where(
            FlashcardDeck.user_id == uid,
            Flashcard.next_review_date <= now,
            Flashcard.is_archived == False,  # noqa: E712
        )
    )
    total_due = count_result.scalar_one()

    return {
        "due_count": total_due,
        "cards": [FlashcardResponse.model_validate(c) for c in cards],
    }


@router.get("/quiz-performance")
async def get_quiz_performance(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the user's recent quiz attempts and aggregated performance stats.
    Used by the 'Quiz Performance' widget.
    """
    uid = current_user.id

    result = await db.execute(
        select(QuizAttempt)
        .where(QuizAttempt.user_id == uid, QuizAttempt.status == "completed")
        .order_by(QuizAttempt.completed_at.desc())
        .limit(limit)
    )
    attempts = result.scalars().all()

    # All-time stats
    stats_result = await db.execute(
        select(func.count(QuizAttempt.id), func.avg(QuizAttempt.score_pct))
        .where(QuizAttempt.user_id == uid, QuizAttempt.status == "completed")
    )
    row = stats_result.one()
    total_attempts = row[0] or 0
    avg_score = float(row[1]) if row[1] is not None else None

    return {
        "attempts_count": total_attempts,
        "avg_score_pct": round(avg_score, 2) if avg_score is not None else None,
        "recent_attempts": [QuizAttemptResponse.model_validate(a) for a in attempts],
    }


@router.get("/collaboration")
async def get_collaboration(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns study groups where the user is a member or creator.
    Used by the 'Collaboration' widget.
    """
    uid = current_user.id

    # Groups where the user is a member
    member_group_ids_result = await db.execute(
        select(StudyGroupMember.study_group_id).where(StudyGroupMember.user_id == uid)
    )
    member_group_ids = {row[0] for row in member_group_ids_result.all()}

    # All groups where user is creator OR member
    result = await db.execute(
        select(StudyGroup)
        .where(
            (StudyGroup.creator_id == uid) | (StudyGroup.id.in_(member_group_ids))
        )
        .order_by(StudyGroup.updated_at.desc())
        .limit(10)
    )
    groups = result.scalars().all()

    # Eager-load members for each group
    for group in groups:
        members_result = await db.execute(
            select(StudyGroupMember).where(StudyGroupMember.study_group_id == group.id)
        )
        group.members = members_result.scalars().all()

    return {
        "groups_count": len(groups),
        "groups": [StudyGroupResponse.model_validate(g) for g in groups],
    }
