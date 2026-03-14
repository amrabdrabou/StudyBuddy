const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const token = localStorage.getItem("access_token");
    const res = await fetch(`${BASE_URL}${path}`, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(init.headers ?? {}),
        },
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? `Request failed: ${res.status}`);
    }
    return res;
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface DashboardSummary {
    total_study_minutes_period: number;
    total_sessions_period: number;
    active_goals_count: number;
}

export interface LearningGoal {
    id: string;
    user_id: string;
    title: string;
    description: string | null;
    goal_type: string;
    status: string;
    study_subject_id: string | null;
    target_date: string | null;
    target_hours: number | null;
    target_score_pct: number | null;
    progress_pct: number;
    total_hours_logged: number;
    created_at: string;
    updated_at: string;
}

export interface ProgressSnapshot {
    id: string;
    snapshot_type: string;
    snapshot_date: string;
    total_study_minutes: number;
    sessions_completed: number;
    micro_goals_completed: number;
    quiz_attempts_count: number;
    quiz_avg_score_pct: number | null;
    flashcards_reviewed: number;
    flashcards_correct_pct: number | null;
    documents_processed: number;
    goal_progress_pct: number | null;
}

export interface AiRecommendation {
    id: string;
    user_id: string;
    session_id: string | null;
    learning_goal_id: string | null;
    recommendation_type: string;
    title: string;
    body: string;
    action_url: string | null;
    is_dismissed: boolean;
    expires_at: string | null;
    created_at: string;
}

export interface TimelineEvent {
    id: string;
    user_id: string;
    session_id: string | null;
    entity_type: string | null;
    entity_id: string | null;
    event_type: string;
    description: string | null;
    metadata_json: string | null;
    is_ai_generated: boolean;
    is_public: boolean;
    created_at: string;
}

export interface StudySession {
    id: string;
    user_id: string;
    title: string | null;
    session_type: string;
    status: string;
    intention_text: string | null;
    intention_type: string | null;
    study_subject_id: string | null;
    learning_goal_id: string | null;
    progress_pct: number;
    micro_goals_total: number;
    micro_goals_done: number;
    started_at: string;
    actual_started_at: string | null;
    ended_at: string | null;
    duration_minutes: number | null;
    is_completed: boolean;
    created_at: string;
    updated_at: string;
}

export interface FlashcardDue {
    id: string;
    deck_id: string;
    front_content: string;
    back_content: string;
    next_review_date: string;
    interval_days: number | null;
    repetitions: number | null;
    total_reviews: number;
    successful_reviews: number;
    is_mastered: boolean;
    difficulty: number | null;
}

export interface QuizAttempt {
    id: string;
    quiz_set_id: string;
    session_id: string | null;
    user_id: string;
    status: string;
    score_pct: number | null;
    time_taken_seconds: number | null;
    started_at: string;
    completed_at: string | null;
}

export interface StudyGroupMember {
    user_id: string;
    study_group_id: string;
    role: string;
    joined_at: string;
    user: { id: string; username: string; email: string };
}

export interface StudyGroup {
    id: string;
    creator_id: string;
    name: string;
    is_private: boolean;
    invite_code: string | null;
    max_members: number | null;
    created_at: string;
    updated_at: string;
    members: StudyGroupMember[];
}

export interface DashboardStats {
    total_study_minutes: number;
    sessions_completed: number;
    micro_goals_completed: number;
    quiz_attempts_count: number;
    quiz_avg_score_pct: number | null;
    flashcards_reviewed: number;
    documents_processed: number;
}

// ── API calls ──────────────────────────────────────────────────────────────────

export interface UserProfile {
    id: string;
    email: string;
    username: string | null;
    first_name: string | null;
    last_name: string | null;
    auth_provider: string;
    is_active: boolean;
    is_verified: boolean;
    created_at: string;
}

export async function getCurrentUser(): Promise<UserProfile> {
    const res = await authFetch("/auth/me");
    return res.json();
}

export interface MainDashboard {
    user: {
        full_name: string;
        username: string | null;
        email: string;
        auth_provider: string;
    };
    summary: DashboardSummary;
    active_goals: LearningGoal[];
    recent_sessions: StudySession[];
    daily_snapshots: ProgressSnapshot[];
    recommendations: AiRecommendation[];
    recent_events: TimelineEvent[];
}

export async function getMainDashboard(days = 7): Promise<MainDashboard> {
    const res = await authFetch(`/dashboard/?days=${days}`);
    return res.json();
}

export async function getDashboardStats(params?: {
    from_date?: string;
    to_date?: string;
    learning_goal_id?: string;
}): Promise<DashboardStats> {
    const query = new URLSearchParams();
    if (params?.from_date) query.set("from_date", params.from_date);
    if (params?.to_date) query.set("to_date", params.to_date);
    if (params?.learning_goal_id) query.set("learning_goal_id", params.learning_goal_id);
    const res = await authFetch(`/dashboard/stats${query.size ? "?" + query : ""}`);
    return res.json();
}

export async function getLastSession(): Promise<{ session: StudySession | null }> {
    const res = await authFetch("/dashboard/last-session");
    return res.json();
}

export async function getFlashcardsDue(limit = 20): Promise<{ due_count: number; cards: FlashcardDue[] }> {
    const res = await authFetch(`/dashboard/flashcards-due?limit=${limit}`);
    return res.json();
}

export async function getQuizPerformance(limit = 10): Promise<{
    attempts_count: number;
    avg_score_pct: number | null;
    recent_attempts: QuizAttempt[];
}> {
    const res = await authFetch(`/dashboard/quiz-performance?limit=${limit}`);
    return res.json();
}

export async function getCollaboration(): Promise<{ groups_count: number; groups: StudyGroup[] }> {
    const res = await authFetch("/dashboard/collaboration");
    return res.json();
}

export async function dismissRecommendation(id: string): Promise<void> {
    await authFetch(`/ai-recommendations/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_dismissed: true }),
    });
}
