import { useEffect, useState } from "react";
import { getDashboard, type RecentSession } from "../api/dashboard";
import { getBigGoals, type BigGoal } from "../api/big_goals";
import { getSubjects } from "../api/subjects";
import { getMe, getToken, type UserResponse } from "../api/auth";
import { SplineScene } from "../components/ui/splite";
import { useNavStore } from "../store/navStore";

const COLORS = ["#818cf8", "#a78bfa", "#c084fc", "#34d399", "#22d3ee"];

export default function OverviewSection() {
  const {
    toGoals, toGoal,
    toSubjectsView, toWorkspacesView, toDocumentsView,
    toSessionsView, toFlashcardsView, toQuizzesView, toNotesView,
  } = useNavStore();

  const [stats, setStats]   = useState<import("../api/dashboard").DashboardStats | null>(null);
  const [goals, setGoals]   = useState<BigGoal[]>([]);
  const [user, setUser]     = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    Promise.all([
      getDashboard(),
      getBigGoals(),
      getSubjects(),
      token ? getMe(token).catch(() => null) : Promise.resolve(null),
    ])
      .then(([dash, g, _s, me]) => {
        setStats(dash); setGoals(g.slice(0, 3)); setUser(me);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const userName = user?.first_name || user?.username || "Scholar";
  const greeting = (() => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; })();
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        {[380, 80, 280].map((h, i) => (
          <div key={i} className="rounded-2xl animate-pulse" style={{ height: h, background: "rgba(255,255,255,0.04)" }} />
        ))}
      </div>
    );
  }

  const steps = [
    {
      step: "01", label: "Missions",   desc: "Your learning goals",
      value: stats?.active_big_goals_count ?? 0, color: "#818cf8",
      onNew: toGoals, onClick: toGoals,
      icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>,
    },
    {
      step: "02", label: "Subjects",   desc: "Topics to master",
      value: stats?.subjects_count ?? 0, color: "#a78bfa",
      onNew: toSubjectsView, onClick: toSubjectsView,
      icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>,
    },
    {
      step: "03", label: "Workspaces", desc: "Study environments",
      value: stats?.active_workspaces_count ?? 0, color: "#10B981",
      onNew: toWorkspacesView, onClick: toWorkspacesView,
      icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>,
    },
    {
      step: "04", label: "Documents",  desc: "Study materials",
      value: stats?.documents_count ?? 0, color: "#22d3ee",
      onNew: toDocumentsView, onClick: toDocumentsView,
      icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>,
    },
    {
      step: "05", label: "Sessions",   desc: "Active study time",
      value: stats?.recent_sessions?.length ?? 0, color: "#34d399",
      onNew: toSessionsView, onClick: toSessionsView,
      icon: <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>,
    },
    {
      step: "06", label: "Flashcards", desc: "AI review decks",
      value: stats?.flashcard_decks_count ?? 0, color: "#f59e0b",
      onNew: toFlashcardsView, onClick: toFlashcardsView,
      icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>,
    },
    {
      step: "07", label: "Quiz Sets",  desc: "Knowledge tests",
      value: stats?.quiz_sets_count ?? 0, color: "#f97316",
      onNew: toQuizzesView, onClick: toQuizzesView,
      icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>,
    },
    {
      step: "08", label: "Notes",      desc: "Captured insights",
      value: stats?.notes_count ?? 0, color: "#ec4899",
      onNew: toNotesView, onClick: toNotesView,
      icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>,
    },
  ];

  return (
    <div className="p-8 overflow-y-auto" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* ①  GREETING */}
      <div className="flex justify-between items-end mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs font-medium mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>{today}</p>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            {greeting}, <span style={{ color: "#818cf8" }}>{userName}</span>
          </h2>
        </div>
        <button onClick={toSessionsView}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-sm hover:opacity-90 active:scale-95 transition-all"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 4px 20px rgba(79,70,229,0.35)" }}>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          Start Daily Session
        </button>
      </div>

      {/* ②  HERO — Robot + CTA */}
      <div className="rounded-2xl mb-6 overflow-hidden relative bg-slate-900 border border-white/[0.06]" style={{ minHeight: 420 }}>
        <div className="flex flex-col md:flex-row h-full" style={{ minHeight: 420 }}>

          {/* Left: CTA + Recent Activity */}
          <div className="px-10 py-10 md:w-[55%] flex flex-col justify-center gap-5">
            {goals.length > 0 ? (
              /* ── HAS GOALS: continue studying ── */
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-emerald-400">
                  Keep the momentum
                </p>
                <h2 className="text-3xl font-extrabold text-white leading-tight">
                  Continue Your{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                    Journey
                  </span>
                </h2>
                <p className="text-sm mt-2 leading-relaxed max-w-sm text-slate-400">
                  {stats && stats.pending_micro_goals_count > 0
                    ? `You have ${stats.pending_micro_goals_count} pending task${stats.pending_micro_goals_count !== 1 ? "s" : ""} — pick up where you left off.`
                    : "You're making progress — keep the streak alive and reach your goals."}
                </p>
              </div>
            ) : (
              /* ── NO GOALS: motivate to start ── */
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-indigo-400">
                  Where every journey begins
                </p>
                <h2 className="text-3xl font-extrabold text-white leading-tight">
                  Define Your{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
                    Mission
                  </span>
                </h2>
                <p className="text-sm mt-2 leading-relaxed max-w-sm text-slate-400">
                  Start with a Mission — your big learning goal. Everything else builds from here.
                </p>
              </div>
            )}

            {/* Recent Activity — show if sessions exist AND has goals, else show example chips */}
            {goals.length > 0 && stats && stats.recent_sessions.length > 0 ? (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>
                  Recent Activity
                </p>
                <div className="flex flex-col gap-2 relative">
                  <div className="absolute left-3 top-2 bottom-2 w-px" style={{ background: "rgba(255,255,255,0.07)" }} />
                  {stats.recent_sessions.slice(0, 3).map((s: RecentSession, i: number) => {
                    const c = COLORS[i % COLORS.length];
                    return (
                      <div key={s.id} className="flex items-center gap-3 pl-8 relative">
                        <div className="absolute left-0 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: `${c}18`, border: `1px solid ${c}35` }}>
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
                        </div>
                        <div className="flex-1 min-w-0 px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <p className="text-sm font-semibold text-white truncate">{s.title ?? "Study Session"}</p>
                          <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                            {new Date(s.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · <span className="capitalize">{s.status}</span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : goals.length > 0 ? (
              /* Has goals but no sessions yet */
              <div className="flex flex-col gap-1.5">
                {goals.slice(0, 3).map((g, i) => {
                  const c = COLORS[i % COLORS.length];
                  return (
                    <div key={g.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer"
                      style={{ background: `${c}0e`, border: `1px solid ${c}25` }}
                      onClick={() => toGoal(g)}>
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c }} />
                      <span className="text-sm font-medium text-white truncate">{g.title}</span>
                      <span className="ml-auto text-[10px] font-bold flex-shrink-0" style={{ color: c }}>{g.progress_pct}%</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* No goals — show example chips */
              <div className="flex flex-col gap-1.5">
                {[
                  { text: "Become an AI Engineer",        color: "#818cf8" },
                  { text: "Pass the Linear Algebra exam", color: "#22d3ee" },
                  { text: "Learn Python",                 color: "#34d399" },
                ].map(ex => (
                  <div key={ex.text} className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
                    style={{ background: `${ex.color}0e`, border: `1px solid ${ex.color}25` }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ex.color }} />
                    <span className="text-sm font-medium text-white">{ex.text}</span>
                  </div>
                ))}
              </div>
            )}

            {goals.length > 0 ? (
              <button onClick={() => toGoal(goals[0])}
                className="self-start flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition-colors"
                style={{ background: "linear-gradient(135deg, #059669, #0891b2)" }}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Launch Session
              </button>
            ) : (
              <button onClick={toGoals}
                className="self-start flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-500 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
                Create Mission
              </button>
            )}
          </div>

          {/* Right: robot */}
          <div className="flex-1 relative" style={{ minHeight: 320 }}>
            <div className="absolute inset-y-0 left-0 w-24 z-10 pointer-events-none"
              style={{ background: "linear-gradient(to right, #0f172a, transparent)" }} />
            <SplineScene scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
              className="w-full h-full absolute inset-0" />
          </div>
        </div>
      </div>

      {/* ③  WORKFLOW STEPS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-24">
        {steps.map(s => (
          <div
            key={s.step}
            className="rounded-xl p-4 flex flex-col"
            style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${s.color}18` }}
          >
            {/* Step badge + New button */}
            <div className="flex items-center justify-between mb-3">
              <span
                className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded-md"
                style={{ color: s.color, background: `${s.color}15` }}
              >
                {s.step}
              </span>
              <button
                onClick={s.onNew}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-md transition-opacity hover:opacity-70"
                style={{ color: s.color, background: `${s.color}15` }}
              >
                + New
              </button>
            </div>

            {/* Clickable body */}
            <button onClick={s.onClick} className="text-left flex-1">
              <div className="flex items-center gap-1.5 mb-2">
                <span style={{ color: s.color }}>{s.icon}</span>
                <p className="text-xs font-semibold text-white truncate">{s.label}</p>
              </div>
              <p className="text-2xl font-black leading-none mb-0.5" style={{ color: s.color }}>
                {s.value}
              </p>
              <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{s.desc}</p>
            </button>
          </div>
        ))}
      </div>

      {/* ⑦  FLOATING AI SUGGESTION BAR */}
      <div className="fixed bottom-6 right-6 left-6 lg:left-[calc(256px+2rem)] z-40">
        <div className="px-5 py-3.5 rounded-2xl flex items-center justify-between"
          style={{
            background: "rgba(2,6,23,0.9)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(99,102,241,0.25)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#818cf8" }}>AI Suggestion</p>
              <p className="text-sm font-medium text-white">
                Upload your study materials — AI will{" "}
                <span className="font-bold" style={{ color: "#a78bfa" }}>generate flashcards & quizzes</span> instantly.
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0 ml-4">
            <button onClick={toGoals}
              className="px-4 py-2 rounded-lg text-xs font-bold transition-colors"
              style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,0.28)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(99,102,241,0.15)")}>
              Upload Docs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
