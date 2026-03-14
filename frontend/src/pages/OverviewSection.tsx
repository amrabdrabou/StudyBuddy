/**
 * OverviewSection – the full-featured dashboard overview with 8 interactive 3D card widgets.
 * Each card uses a CSS perspective tilt effect driven by mouse position.
 */
import { useRef, useCallback } from "react";
import type {
    MainDashboard, DashboardStats, StudySession as DashSession,
    FlashcardDue, StudyGroup,
} from "../api/dashboard";

// ── 3D Card wrapper ─────────────────────────────────────────────────────────────

function Card3D({
    children,
    className = "",
    glowColor = "rgba(99,102,241,0.15)",
}: {
    children: React.ReactNode;
    className?: string;
    glowColor?: string;
}) {
    const cardRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const card = cardRef.current;
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const rotateX = ((y - cy) / cy) * -8;
        const rotateY = ((x - cx) / cx) * 8;
        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(4px)`;
        card.style.boxShadow = `0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 40px ${glowColor}`;
    }, [glowColor]);

    const handleMouseLeave = useCallback(() => {
        const card = cardRef.current;
        if (!card) return;
        card.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg) translateZ(0px)";
        card.style.boxShadow = "0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)";
    }, []);

    return (
        <div
            ref={cardRef}
            className={`bg-slate-900/70 border border-white/[0.08] rounded-2xl backdrop-blur-sm transition-all duration-200 ease-out ${className}`}
            style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)", willChange: "transform" }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            {children}
        </div>
    );
}

// ── Widget: Study Stats ─────────────────────────────────────────────────────────

function StudyStatsCard({ stats, loading }: { stats: DashboardStats | null; loading: boolean }) {
    const metrics = [
        { label: "Study mins (7d)", value: stats?.total_study_minutes ?? 0, color: "text-indigo-400", max: 600 },
        { label: "Sessions (7d)", value: stats?.sessions_completed ?? 0, color: "text-violet-400", max: 20 },
        { label: "Goals completed", value: stats?.micro_goals_completed ?? 0, color: "text-emerald-400", max: 30 },
        { label: "Docs processed", value: stats?.documents_processed ?? 0, color: "text-amber-400", max: 10 },
    ];

    return (
        <Card3D className="p-6 flex flex-col gap-4" glowColor="rgba(99,102,241,0.12)">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-400/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                </div>
                <div>
                    <p className="text-white font-bold text-sm">Study Stats</p>
                    <p className="text-gray-500 text-xs">Past 7 days</p>
                </div>
            </div>
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-8 rounded-lg bg-white/[0.04] animate-pulse" />)}
                </div>
            ) : (
                <div className="space-y-3">
                    {metrics.map((m) => (
                        <div key={m.label}>
                            <div className="flex justify-between mb-1">
                                <span className="text-xs text-gray-500">{m.label}</span>
                                <span className={`text-xs font-bold ${m.color}`}>{m.value}</span>
                            </div>
                            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-700 ${m.color === "text-indigo-400" ? "bg-indigo-500" :
                                        m.color === "text-violet-400" ? "bg-violet-500" :
                                            m.color === "text-emerald-400" ? "bg-emerald-500" : "bg-amber-500"
                                        }`}
                                    style={{ width: `${Math.min(100, (m.value / m.max) * 100)}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card3D>
    );
}

// ── Widget: Learning Goals ──────────────────────────────────────────────────────

function LearningGoalsCard({ goals, loading }: { goals?: MainDashboard["active_goals"]; loading: boolean }) {
    const displayed = (goals ?? []).slice(0, 3);
    return (
        <Card3D className="p-6 flex flex-col gap-4" glowColor="rgba(139,92,246,0.12)">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-400/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                </div>
                <div>
                    <p className="text-white font-bold text-sm">Learning Goals</p>
                    <p className="text-gray-500 text-xs">{goals?.length ?? 0} active</p>
                </div>
            </div>
            {loading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-10 rounded-xl bg-white/[0.04] animate-pulse" />)}</div>
            ) : displayed.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-4">No active goals yet</p>
            ) : (
                <div className="space-y-3">
                    {displayed.map((g) => (
                        <div key={g.id} className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center">
                                <p className="text-white text-xs font-medium truncate flex-1 mr-2">{g.title}</p>
                                <span className="text-violet-400 text-xs font-bold flex-shrink-0">{g.progress_pct}%</span>
                            </div>
                            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                                <div className="h-full bg-violet-500 rounded-full transition-all duration-700"
                                    style={{ width: `${Math.min(100, g.progress_pct)}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card3D>
    );
}

// ── Widget: Quiz Performance ────────────────────────────────────────────────────

function QuizPerformanceCard({ quiz, loading }: {
    quiz: { attempts_count: number; avg_score_pct: number | null; recent_attempts: any[] } | null;
    loading: boolean;
}) {
    const score = quiz?.avg_score_pct ?? null;

    return (
        <Card3D className="p-6 flex flex-col gap-4" glowColor="rgba(245,158,11,0.12)">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-400/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                </div>
                <div>
                    <p className="text-white font-bold text-sm">Quiz Performance</p>
                    <p className="text-gray-500 text-xs">{quiz?.attempts_count ?? 0} attempts</p>
                </div>
            </div>
            {loading ? (
                <div className="h-20 rounded-xl bg-white/[0.04] animate-pulse" />
            ) : score === null ? (
                <p className="text-gray-600 text-sm text-center py-4">No quizzes completed yet</p>
            ) : (
                <div className="flex flex-col items-center gap-1">
                    {/* Semi-circle gauge */}
                    <div className="relative w-28 h-14 overflow-hidden">
                        <svg viewBox="0 0 120 60" className="w-full h-full">
                            <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeLinecap="round" />
                            <path
                                d="M 10 60 A 50 50 0 0 1 110 60"
                                fill="none"
                                stroke={score >= 70 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444"}
                                strokeWidth="10"
                                strokeLinecap="round"
                                strokeDasharray={`${(score / 100) * 157.08} 157.08`}
                                className="transition-all duration-700"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-end justify-center pb-0.5">
                            <span className="text-lg font-black text-white">{score}%</span>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500">avg score</p>
                    <div className="w-full mt-2 space-y-1">
                        {(quiz?.recent_attempts ?? []).slice(0, 3).map((a: any, i: number) => (
                            <div key={i} className="flex justify-between text-xs">
                                <span className="text-gray-500 truncate">{new Date(a.completed_at ?? a.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                                <span className={`font-bold ${(a.score_pct ?? 0) >= 70 ? "text-emerald-400" : (a.score_pct ?? 0) >= 50 ? "text-amber-400" : "text-red-400"}`}>
                                    {a.score_pct ?? "—"}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Card3D>
    );
}

// ── Widget: Flashcards Due ──────────────────────────────────────────────────────

function FlashcardsDueCard({ flashcards, loading }: {
    flashcards: { due_count: number; cards: FlashcardDue[] } | null;
    loading: boolean;
}) {
    const count = flashcards?.due_count ?? 0;
    return (
        <Card3D className="p-6 flex flex-col gap-4" glowColor="rgba(16,185,129,0.12)">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                </div>
                <div>
                    <p className="text-white font-bold text-sm">Flashcards Due</p>
                    <p className="text-gray-500 text-xs">SRS review queue</p>
                </div>
            </div>
            {loading ? (
                <div className="h-16 rounded-xl bg-white/[0.04] animate-pulse" />
            ) : (
                <>
                    <div className="flex items-end gap-2">
                        <span className={`text-4xl font-black tracking-tight ${count > 0 ? "text-emerald-400" : "text-gray-600"}`}>{count}</span>
                        <span className="text-gray-500 text-sm mb-1.5">cards</span>
                    </div>
                    {count > 0 ? (
                        <div className="space-y-2">
                            {(flashcards?.cards ?? []).slice(0, 3).map((c) => (
                                <div key={c.id} className="flex items-center gap-2 bg-white/[0.04] rounded-lg px-3 py-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                                    <p className="text-xs text-gray-300 truncate flex-1">{c.front_content}</p>
                                    <span className="text-xs text-gray-600 flex-shrink-0">
                                        {c.next_review_date ? new Date(c.next_review_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                                    </span>
                                </div>
                            ))}
                            {count > 3 && <p className="text-xs text-gray-600 text-center">+{count - 3} more</p>}
                        </div>
                    ) : (
                        <p className="text-gray-600 text-xs">All caught up! 🎉</p>
                    )}
                </>
            )}
        </Card3D>
    );
}

// ── Widget: Continue Session ────────────────────────────────────────────────────

function ContinueSessionCard({
    session, loading, onStartNew,
}: {
    session: DashSession | null | undefined;
    loading: boolean;
    onStartNew: () => void;
}) {
    const isResumable = session?.status === "active" || session?.status === "pending";

    return (
        <Card3D className="p-6 flex flex-col gap-4 relative overflow-hidden" glowColor="rgba(59,130,246,0.2)">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-3 relative z-10">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div>
                    <p className="text-white font-bold text-sm tracking-tight">{isResumable ? "Continue Session" : "Last Session"}</p>
                    <p className="text-blue-200/60 text-xs">{session?.status ?? "No sessions yet"}</p>
                </div>
            </div>
            {loading ? (
                <div className="h-16 rounded-xl bg-white/[0.04] animate-pulse relative z-10" />
            ) : session ? (
                <div className="flex flex-col gap-4 mt-2 relative z-10">
                    <div className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/5 rounded-xl p-4 shadow-inner">
                        <p className="text-white font-bold text-sm truncate">{session.title || "Untitled Session"}</p>
                        <p className="text-[11px] font-medium text-blue-300/80 mt-1 uppercase tracking-wider">{session.session_type} • {session.status}</p>
                        {session.intention_text && (
                            <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">{session.intention_text}</p>
                        )}
                    </div>
                    {isResumable && (
                        <button className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-black tracking-wide shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_25px_rgba(59,130,246,0.6)] hover:scale-[1.02] transition-all">
                            ▶ RESUME SESSION
                        </button>
                    )}
                </div>
            ) : (
                <div className="flex flex-col gap-4 mt-2 relative z-10">
                    <p className="text-gray-500 text-sm leading-relaxed">No sessions yet. Ready to start building your knowledge?</p>
                    <button onClick={onStartNew} className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-black tracking-wide shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all">
                        + START NEW SESSION
                    </button>
                </div>
            )}
        </Card3D>
    );
}

// ── Widget: AI Recommendations ─────────────────────────────────────────────────

function AiRecommendationsCard({
    recs, loading, onDismiss,
}: {
    recs?: MainDashboard["recommendations"];
    loading: boolean;
    onDismiss: (id: string) => void;
}) {
    const displayed = (recs ?? []).slice(0, 3);
    const typeColors: Record<string, string> = {
        next_session: "text-indigo-400 bg-indigo-500/10",
        review_reminder: "text-violet-400 bg-violet-500/10",
        pace_warning: "text-amber-400 bg-amber-500/10",
        topic_suggestion: "text-emerald-400 bg-emerald-500/10",
    };

    return (
        <Card3D className="p-6 flex flex-col gap-4" glowColor="rgba(168,85,247,0.12)">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-400/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                </div>
                <div>
                    <p className="text-white font-bold text-sm">AI Recommendations</p>
                    <p className="text-gray-500 text-xs">{recs?.length ?? 0} active</p>
                </div>
            </div>
            {loading ? (
                <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-14 rounded-xl bg-white/[0.04] animate-pulse" />)}</div>
            ) : displayed.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-4">No recommendations right now</p>
            ) : (
                <div className="space-y-2">
                    {displayed.map((r) => (
                        <div key={r.id} className="group bg-white/[0.04] rounded-xl p-3 flex gap-3 items-start">
                            <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ${typeColors[r.recommendation_type] ?? "text-gray-400 bg-white/10"}`}>
                                {r.recommendation_type.replace("_", " ")}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white text-xs font-semibold truncate">{r.title}</p>
                                <p className="text-gray-500 text-xs line-clamp-1 mt-0.5">{r.body}</p>
                            </div>
                            <button
                                onClick={() => onDismiss(r.id)}
                                className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-gray-300 transition-all flex-shrink-0"
                                title="Dismiss"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </Card3D>
    );
}

// ── Widget: Timeline ────────────────────────────────────────────────────────────

function TimelineCard({ events, loading }: { events?: MainDashboard["recent_events"]; loading: boolean }) {
    const displayed = (events ?? []).slice(0, 6);

    const eventIcon = (type: string) => {
        if (type.includes("session")) return { icon: "⚡", color: "bg-amber-500/15 border-amber-400/20" };
        if (type.includes("quiz")) return { icon: "📝", color: "bg-blue-500/15 border-blue-400/20" };
        if (type.includes("goal")) return { icon: "🎯", color: "bg-violet-500/15 border-violet-400/20" };
        if (type.includes("flashcard")) return { icon: "🗂️", color: "bg-emerald-500/15 border-emerald-400/20" };
        if (type.includes("document")) return { icon: "📄", color: "bg-slate-500/15 border-slate-400/20" };
        return { icon: "📌", color: "bg-gray-500/15 border-gray-400/20" };
    };

    return (
        <Card3D className="p-6 flex flex-col gap-4" glowColor="rgba(51,65,85,0.2)">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-500/15 border border-slate-400/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div>
                    <p className="text-white font-bold text-sm">Activity Timeline</p>
                    <p className="text-gray-500 text-xs">Recent events</p>
                </div>
            </div>
            {loading ? (
                <div className="space-y-3">{[1, 2, 3, 4].map(i => <div key={i} className="h-8 rounded-lg bg-white/[0.04] animate-pulse" />)}</div>
            ) : displayed.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-4">No activity recorded yet</p>
            ) : (
                <div className="relative">
                    <div className="absolute left-[1.1rem] top-0 bottom-0 w-px bg-white/[0.06]" />
                    <div className="space-y-3">
                        {displayed.map((e) => {
                            const { icon, color } = eventIcon(e.event_type);
                            return (
                                <div key={e.id} className="flex gap-3 items-start relative pl-1">
                                    <div className={`w-7 h-7 rounded-lg border text-sm flex items-center justify-center flex-shrink-0 ${color}`}>
                                        {icon}
                                    </div>
                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <p className="text-white/80 text-xs font-medium truncate">{e.description ?? e.event_type.split("_").join(" ")}</p>
                                        <p className="text-gray-600 text-xs">
                                            {new Date(e.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </Card3D>
    );
}

// ── Widget: Collaboration ───────────────────────────────────────────────────────

function CollaborationCard({ collab, loading }: {
    collab: { groups_count: number; groups: StudyGroup[] } | null;
    loading: boolean;
}) {
    const groups = collab?.groups ?? [];
    return (
        <Card3D className="p-6 flex flex-col gap-4" glowColor="rgba(236,72,153,0.1)">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-pink-500/15 border border-pink-400/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                </div>
                <div>
                    <p className="text-white font-bold text-sm">Collaboration</p>
                    <p className="text-gray-500 text-xs">{collab?.groups_count ?? 0} groups</p>
                </div>
            </div>
            {loading ? (
                <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-12 rounded-xl bg-white/[0.04] animate-pulse" />)}</div>
            ) : groups.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-4">Not in any study groups yet</p>
            ) : (
                <div className="space-y-2">
                    {groups.slice(0, 4).map((g) => (
                        <div key={g.id} className="flex items-center gap-3 bg-white/[0.04] rounded-xl px-3 py-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0
                ${g.is_private ? "bg-pink-500/15 text-pink-400" : "bg-blue-500/15 text-blue-400"}`}>
                                {g.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white text-xs font-semibold truncate">{g.name}</p>
                                <p className="text-gray-500 text-xs">{g.members.length} member{g.members.length !== 1 ? "s" : ""} • {g.is_private ? "Private" : "Public"}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card3D>
    );
}


// ── Main OverviewSection ────────────────────────────────────────────────────────

interface OverviewSectionProps {
    dashMain: MainDashboard | null;
    dashStats: DashboardStats | null;
    dashLastSession: DashSession | null | undefined;
    dashFlashcards: { due_count: number; cards: FlashcardDue[] } | null;
    dashQuiz: { attempts_count: number; avg_score_pct: number | null; recent_attempts: any[] } | null;
    dashCollab: { groups_count: number; groups: StudyGroup[] } | null;
    dashLoading: boolean;
    onCreateSubject: () => void;
    onCreateNote: () => void;
    onCreateSession: () => void;
    onDismissRec: (id: string) => void;
}

export default function OverviewSection({
    dashMain, dashStats, dashLastSession, dashFlashcards, dashQuiz, dashCollab, dashLoading,
    onCreateSubject, onCreateNote, onCreateSession, onDismissRec,
}: OverviewSectionProps) {
    return (
        <div className="flex flex-col gap-10 pb-16">
            {/* Header & Motivation */}
            <div className="flex flex-col gap-4">
                <div className="inline-flex items-center gap-2 bg-indigo-500/10 px-4 py-1.5 rounded-full border border-indigo-400/20 w-fit">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500" />
                    </span>
                    <span className="text-xs font-bold text-indigo-300 tracking-wide uppercase">
                        Dashboard Active
                    </span>
                </div>
                <h2 className="text-5xl sm:text-6xl font-extrabold tracking-tighter text-white leading-[1.1]">
                    Welcome back, {dashMain?.user?.full_name?.split(' ')[0] || dashMain?.user?.username || "Scholar"}! <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500">
                        You're on a 5-day streak.
                    </span>
                </h2>
                <p className="text-gray-400 text-lg leading-relaxed max-w-2xl mt-2">
                    Here's a live snapshot of your learning journey. Check your flashcards, review recent quizzes, or jump right back into your last session.
                </p>
            </div>

            {/* Quick Actions (Redesigned as Pills) */}
            <div className="flex flex-wrap gap-3">
                <button onClick={onCreateSubject}
                    className="group bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 border border-indigo-500/20 hover:border-indigo-400/40 px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                    New Subject
                </button>
                <button onClick={onCreateNote}
                    className="group bg-violet-600/10 hover:bg-violet-600/20 text-violet-300 border border-violet-500/20 hover:border-violet-400/40 px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2">
                    <svg className="w-4 h-4 text-violet-400 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    Quick Note
                </button>
                <button onClick={onCreateSession}
                    className="group bg-amber-600/10 hover:bg-amber-600/20 text-amber-300 border border-amber-500/20 hover:border-amber-400/40 px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Start Session
                </button>
            </div>

            {/* Main Widget Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Primary Column */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <StudyStatsCard stats={dashStats} loading={dashLoading} />
                        <ContinueSessionCard session={dashLastSession} loading={dashLoading} onStartNew={onCreateSession} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <LearningGoalsCard goals={dashMain?.active_goals} loading={dashLoading} />
                        <TimelineCard events={dashMain?.recent_events} loading={dashLoading} />
                    </div>
                </div>

                {/* Secondary Column */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    <AiRecommendationsCard recs={dashMain?.recommendations} loading={dashLoading} onDismiss={onDismissRec} />
                    <FlashcardsDueCard flashcards={dashFlashcards} loading={dashLoading} />
                    <QuizPerformanceCard quiz={dashQuiz} loading={dashLoading} />
                    <CollaborationCard collab={dashCollab} loading={dashLoading} />
                </div>

            </div>
        </div>
    );
}
