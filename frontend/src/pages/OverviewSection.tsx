/**
 * OverviewSection – command-center summary dashboard.
 *
 * Answers four questions at a glance:
 *   1. Where am I?         → greeting + today's stats
 *   2. What needs action?  → flashcards due, goal progress
 *   3. What's next?        → last session card + AI chips
 *   4. How am I doing?     → progress ring + weekly snapshot
 *
 * No full lists are rendered here — each feature gets its own page.
 */
import { useRef, useCallback } from "react";
import type {
    MainDashboard, DashboardStats, StudySession as DashSession,
    FlashcardDue, StudyGroup, UserProfile,
} from "../api/dashboard";

// ── Time-aware greeting ───────────────────────────────────────────────────────

function greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
}

function todayLabel(): string {
    return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

// ── 3D Card wrapper ───────────────────────────────────────────────────────────

function Card3D({
    children,
    className = "",
    glowColor = "rgba(99,102,241,0.15)",
    onClick,
}: {
    children: React.ReactNode;
    className?: string;
    glowColor?: string;
    onClick?: () => void;
}) {
    const cardRef = useRef<HTMLDivElement>(null);

    const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const card = cardRef.current;
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const rx = ((e.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * -6;
        const ry = ((e.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 6;
        card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(4px)`;
        card.style.boxShadow = `0 20px 60px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.06),0 0 40px ${glowColor}`;
    }, [glowColor]);

    const onLeave = useCallback(() => {
        const card = cardRef.current;
        if (!card) return;
        card.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg) translateZ(0px)";
        card.style.boxShadow = "0 4px 24px rgba(0,0,0,0.3),0 0 0 1px rgba(255,255,255,0.06)";
    }, []);

    return (
        <div
            ref={cardRef}
            onClick={onClick}
            className={`bg-slate-900/70 border border-white/[0.08] rounded-2xl backdrop-blur-sm
                        transition-all duration-200 ease-out ${onClick ? "cursor-pointer" : ""} ${className}`}
            style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.3),0 0 0 1px rgba(255,255,255,0.06)", willChange: "transform" }}
            onMouseMove={onMove}
            onMouseLeave={onLeave}
        >
            {children}
        </div>
    );
}

// ── Stat tile ─────────────────────────────────────────────────────────────────

function StatTile({
    label, value, sub, icon, colorClass, loading,
}: {
    label: string; value: string | number; sub?: string;
    icon: React.ReactNode; colorClass: string; loading: boolean;
}) {
    return (
        <div className="bg-slate-900/60 border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colorClass}`}>
                {icon}
            </div>
            {loading ? (
                <div className="space-y-2">
                    <div className="h-7 w-16 bg-white/[0.06] rounded-lg animate-pulse" />
                    <div className="h-3 w-24 bg-white/[0.04] rounded animate-pulse" />
                </div>
            ) : (
                <div>
                    <p className="text-2xl font-black text-white leading-none">{value}</p>
                    <p className="text-xs text-gray-500 mt-1">{label}</p>
                    {sub && <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>}
                </div>
            )}
        </div>
    );
}

// ── Progress ring ─────────────────────────────────────────────────────────────

function StudyProgressRing({ studiedMins, goalMins = 120, loading }: {
    studiedMins: number; goalMins?: number; loading: boolean;
}) {
    const pct = Math.min(100, goalMins > 0 ? Math.round((studiedMins / goalMins) * 100) : 0);
    const r = 72;
    const circumference = 2 * Math.PI * r;
    const dashoffset = circumference * (1 - pct / 100);
    const color = pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#6366f1";
    const textColor = pct >= 80 ? "text-emerald-400" : pct >= 50 ? "text-amber-400" : "text-indigo-400";

    return (
        <Card3D className="p-6 flex flex-col items-center justify-center gap-4" glowColor="rgba(245,158,11,0.12)">
            <p className="text-sm font-semibold text-gray-400">Today's Goal</p>
            {loading ? (
                <div className="w-40 h-40 rounded-full bg-white/[0.04] animate-pulse" />
            ) : (
                <div className="relative flex items-center justify-center">
                    <svg className="w-40 h-40 -rotate-90" viewBox="0 0 180 180">
                        <circle cx="90" cy="90" r={r} fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                        <circle cx="90" cy="90" r={r} fill="transparent" stroke={color} strokeWidth="12"
                            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashoffset}
                            className="transition-all duration-700" />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                        <span className={`text-3xl font-black ${textColor}`}>{pct}%</span>
                        <span className="text-[10px] text-gray-500 mt-0.5">{studiedMins}/{goalMins} min</span>
                    </div>
                </div>
            )}
            <p className="text-xs text-gray-600 font-medium">Daily study target</p>
        </Card3D>
    );
}

// ── Last session / resume card ────────────────────────────────────────────────

function ResumeCard({ session, loading, onResume, onStartNew }: {
    session: DashSession | null | undefined; loading: boolean;
    onResume: () => void; onStartNew: () => void;
}) {
    const resumable = session?.status === "active" || session?.status === "pending";

    return (
        <Card3D className="p-5 flex flex-col gap-4 relative overflow-hidden" glowColor="rgba(59,130,246,0.15)">
            <div className="absolute -top-8 -right-8 w-28 h-28 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Continue Studying</p>
            </div>

            {loading ? (
                <div className="space-y-2">
                    <div className="h-5 bg-white/[0.06] rounded animate-pulse" />
                    <div className="h-3 bg-white/[0.04] rounded w-2/3 animate-pulse" />
                </div>
            ) : session ? (
                <div className="flex flex-col gap-3">
                    <div>
                        <p className="text-white font-semibold leading-tight">{session.title || "Untitled Session"}</p>
                        <p className="text-xs text-gray-500 mt-0.5 capitalize">{session.session_type} · {session.status}</p>
                    </div>
                    {resumable && (
                        <div>
                            <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${session.progress_pct || 40}%` }} />
                            </div>
                            <p className="text-[10px] text-gray-600 mt-1">{session.micro_goals_done}/{session.micro_goals_total} goals done</p>
                        </div>
                    )}
                    <button onClick={resumable ? onResume : onStartNew}
                        className="self-start flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300
                                   text-sm font-semibold transition-colors group">
                        {resumable ? "Resume session" : "Start new session"}
                        <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    <p className="text-sm text-gray-500">No active session — ready to dive in?</p>
                    <button onClick={onStartNew}
                        className="self-start flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300
                                   text-sm font-semibold transition-colors group">
                        Start a session
                        <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            )}
        </Card3D>
    );
}

// ── Attention items ───────────────────────────────────────────────────────────

function AttentionRow({ label, detail, urgent, onClick }: {
    label: string; detail: string; urgent?: boolean; onClick: () => void;
}) {
    return (
        <button onClick={onClick}
            className="w-full flex items-center justify-between gap-3 p-3 rounded-xl
                       bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06]
                       hover:border-white/[0.12] transition-all group text-left">
            <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${urgent ? "bg-amber-400" : "bg-indigo-400"}`} />
                <div>
                    <p className="text-sm font-medium text-white">{label}</p>
                    <p className="text-xs text-gray-500">{detail}</p>
                </div>
            </div>
            <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-300 transition-colors flex-shrink-0"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
        </button>
    );
}

// ── AI suggestion chips ───────────────────────────────────────────────────────

const REC_ICONS: Record<string, string> = {
    next_session: "⚡", review_reminder: "📄", pace_warning: "⏱️", topic_suggestion: "🔗",
};

function AiChips({ recs, loading, onDismiss }: {
    recs?: MainDashboard["recommendations"]; loading: boolean; onDismiss: (id: string) => void;
}) {
    const items = (recs ?? []).filter(r => !r.is_dismissed).slice(0, 2);

    if (loading) return (
        <div className="flex flex-col gap-2">
            {[1, 2].map(i => <div key={i} className="h-14 bg-white/[0.04] rounded-xl animate-pulse" />)}
        </div>
    );

    if (items.length === 0) return (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <span className="text-base">✨</span>
            <p className="text-xs text-gray-600">No suggestions right now — keep studying!</p>
        </div>
    );

    return (
        <div className="flex flex-col gap-2">
            {items.map(r => (
                <div key={r.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.08]
                               hover:bg-white/[0.06] transition-all group">
                    <span className="text-base flex-shrink-0">{REC_ICONS[r.recommendation_type] ?? "💡"}</span>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{r.title}</p>
                        <p className="text-[10px] text-gray-500 truncate">{r.body}</p>
                    </div>
                    <button onClick={() => onDismiss(r.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-600 hover:text-gray-300 transition-all">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            ))}
        </div>
    );
}

// ── Feature quick-nav tiles ───────────────────────────────────────────────────

function FeatureTile({
    label, icon, count, countLabel, accent, onClick,
}: {
    label: string; icon: React.ReactNode; count?: number | null; countLabel?: string;
    accent: string; onClick: () => void;
}) {
    return (
        <button onClick={onClick}
            className={`group relative flex flex-col gap-3 p-5 rounded-2xl border text-left
                        bg-slate-900/60 border-white/[0.08] hover:border-opacity-60 transition-all duration-200
                        hover:-translate-y-0.5 ${accent}`}>
            <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center group-hover:bg-white/[0.1] transition-colors">
                    {icon}
                </div>
                {count != null && (
                    <span className="text-lg font-black text-white">{count}</span>
                )}
            </div>
            <div>
                <p className="text-sm font-semibold text-white">{label}</p>
                {countLabel && <p className="text-xs text-gray-500 mt-0.5">{countLabel}</p>}
            </div>
        </button>
    );
}

// ── Recent activity (compact, max 4 rows) ─────────────────────────────────────

function RecentFeed({ events, loading, onViewAll }: {
    events?: MainDashboard["recent_events"]; loading: boolean; onViewAll: () => void;
}) {
    const rows = (events ?? []).slice(0, 4);

    function icon(type: string) {
        if (type.includes("session")) return "🎯";
        if (type.includes("quiz"))    return "📝";
        if (type.includes("goal"))    return "🏆";
        if (type.includes("flash"))   return "🃏";
        if (type.includes("document")) return "📄";
        return "📌";
    }

    function fmtTime(iso: string) {
        const d = new Date(iso);
        const now = new Date();
        const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
        if (diff < 60) return "just now";
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Recent Activity</h2>
                <button onClick={onViewAll}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors flex items-center gap-1 group">
                    View subjects
                    <svg className="w-3 h-3 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            <div className="bg-slate-900/60 border border-white/[0.07] rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
                {loading ? (
                    [...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4 px-5 py-4">
                            <div className="w-8 h-8 bg-white/[0.05] rounded-xl animate-pulse flex-shrink-0" />
                            <div className="flex-1 space-y-1.5">
                                <div className="h-3.5 bg-white/[0.06] rounded animate-pulse w-3/4" />
                                <div className="h-2.5 bg-white/[0.04] rounded animate-pulse w-1/2" />
                            </div>
                            <div className="h-2.5 bg-white/[0.04] rounded animate-pulse w-12" />
                        </div>
                    ))
                ) : rows.length === 0 ? (
                    <div className="px-5 py-10 text-center text-gray-600 text-sm">
                        No activity yet — start your first session!
                    </div>
                ) : (
                    rows.map(e => (
                        <div key={e.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                            <div className="w-8 h-8 rounded-xl bg-white/[0.05] flex items-center justify-center flex-shrink-0 text-sm">
                                {icon(e.event_type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-300 truncate">
                                    {e.description ?? e.event_type.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                                </p>
                            </div>
                            <span className="text-xs text-gray-600 flex-shrink-0">{fmtTime(e.created_at)}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export interface OverviewSectionProps {
    dashMain:        MainDashboard | null;
    dashStats:       DashboardStats | null;
    dashLastSession: DashSession | null | undefined;
    dashFlashcards:  { due_count: number; cards: FlashcardDue[] } | null;
    dashQuiz:        { attempts_count: number; avg_score_pct: number | null; recent_attempts: any[] } | null;
    dashCollab:      { groups_count: number; groups: StudyGroup[] } | null;
    dashLoading:     boolean;
    userProfile:     UserProfile | null;
    streak:          number;
    subjectsCount:   number;
    // Navigation
    onCreateSession:        () => void;
    onResumeSession:        (subjectId: string | null) => void;
    onNavigateToSessions:   () => void;
    onNavigateToSubjects:   () => void;
    onNavigateToLibrary:    () => void;
    onNavigateToGoals:      () => void;
    onNavigateToGroups:     () => void;
    onCreateSubject:        () => void;
    onCreateGoal:           () => void;
    onDismissRec:           (id: string) => void | Promise<void>;
}

export default function OverviewSection({
    dashMain, dashStats, dashLastSession, dashFlashcards, dashQuiz, dashCollab,
    dashLoading, userProfile, streak, subjectsCount,
    onCreateSession, onResumeSession, onNavigateToSubjects,
    onNavigateToLibrary, onNavigateToGoals, onNavigateToGroups,
    onDismissRec,
}: OverviewSectionProps) {
    const firstName =
        userProfile?.first_name ||
        dashMain?.user?.full_name?.split(" ")[0] ||
        dashMain?.user?.username ||
        "Scholar";

    const studiedMins  = dashStats?.total_study_minutes ?? 0;
    const sessionsCount = dashStats?.sessions_completed ?? 0;
    const activeGoals  = dashMain?.summary?.active_goals_count ?? 0;
    const flashDue     = dashFlashcards?.due_count ?? 0;
    const quizAvg      = dashQuiz?.avg_score_pct;
    const groupsCount  = dashCollab?.groups_count ?? 0;

    return (
        <div className="flex flex-col gap-8 pb-8">

            {/* ── 1. Hero greeting ── */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white">
                            {greeting()},{" "}
                            <span className="text-amber-400">{firstName}</span>
                            {streak > 0 && (
                                <span className="ml-2 text-base font-normal text-amber-500/80 align-middle">
                                    🔥 {streak}-day streak
                                </span>
                            )}
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">{todayLabel()}</p>
                    </div>

                    <div className="flex gap-2.5 flex-wrap">
                        <button onClick={onCreateSession}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white
                                       px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors
                                       shadow-lg shadow-indigo-600/20">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                            Start Session
                        </button>
                        <button onClick={onNavigateToSubjects}
                            className="flex items-center gap-2 bg-white/[0.06] border border-white/[0.1]
                                       hover:bg-white/[0.1] text-gray-300 px-5 py-2.5 rounded-xl
                                       font-semibold text-sm transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            My Subjects
                        </button>
                    </div>
                </div>
            </div>

            {/* ── 2. Stat tiles ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatTile
                    loading={dashLoading}
                    label="Study time today"
                    value={studiedMins >= 60 ? `${(studiedMins / 60).toFixed(1)}h` : `${studiedMins}m`}
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    colorClass="bg-indigo-500/15 text-indigo-400"
                />
                <StatTile
                    loading={dashLoading}
                    label="Sessions done"
                    value={sessionsCount}
                    sub="all time"
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
                    colorClass="bg-cyan-500/15 text-cyan-400"
                />
                <StatTile
                    loading={dashLoading}
                    label="Active goals"
                    value={activeGoals}
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                    colorClass="bg-violet-500/15 text-violet-400"
                />
                <StatTile
                    loading={dashLoading}
                    label="Day streak"
                    value={streak}
                    sub={streak > 0 ? "keep it going!" : "start today"}
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg>}
                    colorClass="bg-amber-500/15 text-amber-400"
                />
            </div>

            {/* ── 3. Main content: left (resume + attention) | right (ring + AI) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left 2/3 */}
                <div className="lg:col-span-2 flex flex-col gap-5">
                    <ResumeCard
                        session={dashLastSession}
                        loading={dashLoading}
                        onResume={() => onResumeSession(dashLastSession?.study_subject_id ?? null)}
                        onStartNew={onCreateSession}
                    />

                    {/* Needs attention */}
                    <Card3D className="p-5 flex flex-col gap-4" glowColor="rgba(245,158,11,0.1)">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Needs Attention</p>
                        <div className="flex flex-col gap-2">
                            <AttentionRow
                                label={flashDue > 0 ? `${flashDue} flashcard${flashDue !== 1 ? "s" : ""} due for review` : "Flashcards — all caught up"}
                                detail={flashDue > 0 ? "Don't lose your streak" : "No cards due right now"}
                                urgent={flashDue > 5}
                                onClick={onNavigateToLibrary}
                            />
                            <AttentionRow
                                label={activeGoals > 0 ? `${activeGoals} active goal${activeGoals !== 1 ? "s" : ""} in progress` : "No active learning goals"}
                                detail={activeGoals > 0 ? "Check milestones and due dates" : "Set a goal to stay on track"}
                                urgent={false}
                                onClick={onNavigateToGoals}
                            />
                            {quizAvg != null && (
                                <AttentionRow
                                    label={`Quiz average: ${Math.round(quizAvg)}%`}
                                    detail={quizAvg < 60 ? "Below target — consider reviewing" : "Good performance, keep it up"}
                                    urgent={quizAvg < 60}
                                    onClick={onNavigateToLibrary}
                                />
                            )}
                        </div>
                    </Card3D>
                </div>

                {/* Right 1/3 */}
                <div className="flex flex-col gap-5">
                    <StudyProgressRing
                        studiedMins={studiedMins}
                        goalMins={120}
                        loading={dashLoading}
                    />

                    <Card3D className="p-5 flex flex-col gap-3" glowColor="rgba(99,102,241,0.08)">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">AI Suggestions</p>
                        <AiChips
                            recs={dashMain?.recommendations}
                            loading={dashLoading}
                            onDismiss={(id) => { void onDismissRec(id); }}
                        />
                    </Card3D>
                </div>
            </div>

            {/* ── 4. Feature quick-nav ── */}
            <div className="flex flex-col gap-3">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Jump To</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <FeatureTile
                        label="Subjects"
                        count={subjectsCount}
                        countLabel={`subject${subjectsCount !== 1 ? "s" : ""}`}
                        accent="hover:border-indigo-500/60"
                        onClick={onNavigateToSubjects}
                        icon={<svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
                    />
                    <FeatureTile
                        label="Library"
                        count={dashStats?.documents_processed ?? null}
                        countLabel="docs processed"
                        accent="hover:border-cyan-500/60"
                        onClick={onNavigateToLibrary}
                        icon={<svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>}
                    />
                    <FeatureTile
                        label="Goals"
                        count={activeGoals}
                        countLabel="active"
                        accent="hover:border-violet-500/60"
                        onClick={onNavigateToGoals}
                        icon={<svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                    />
                    <FeatureTile
                        label="Groups"
                        count={groupsCount}
                        countLabel={`group${groupsCount !== 1 ? "s" : ""}`}
                        accent="hover:border-emerald-500/60"
                        onClick={onNavigateToGroups}
                        icon={<svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                    />
                    <FeatureTile
                        label="Flashcards"
                        count={flashDue > 0 ? flashDue : null}
                        countLabel={flashDue > 0 ? "due now" : "all caught up"}
                        accent={flashDue > 0 ? "hover:border-amber-500/60" : "hover:border-emerald-500/60"}
                        onClick={onNavigateToLibrary}
                        icon={<svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
                    />
                </div>
            </div>

            {/* ── 5. Recent activity (compact) ── */}
            <RecentFeed
                events={dashMain?.recent_events}
                loading={dashLoading}
                onViewAll={onNavigateToSubjects}
            />
        </div>
    );
}
