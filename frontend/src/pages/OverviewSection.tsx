import { useEffect, useState } from "react";
import { getDashboard, type DashboardStats, type RecentSession } from "../api/dashboard";
import { getBigGoals, type BigGoal } from "../api/big_goals";
import { getSubjects, type Subject } from "../api/subjects";
import { getMe, getToken, type UserResponse } from "../api/auth";
import { SplineScene } from "../components/ui/splite";

const CIRC = 175.93;
// Home-inspired palette: indigo → violet → purple → emerald → cyan
const COLORS = ["#818cf8", "#a78bfa", "#c084fc", "#34d399", "#22d3ee"];

function CircleProgress({ pct, color }: { pct: number; color: string }) {
  const offset = CIRC * (1 - pct / 100);
  return (
    <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="28" fill="transparent" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
      <circle cx="32" cy="32" r="28" fill="transparent" stroke={color}
        strokeWidth="4" strokeDasharray={CIRC} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.6s ease" }} />
    </svg>
  );
}

function daysLeft(deadline?: string | null) {
  if (!deadline) return null;
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (diff < 0) return "Overdue";
  if (diff === 0) return "Due today";
  return `${diff}d left`;
}

const glass = {
  background: "rgba(255,255,255,0.03)",
  backdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.07)",
} as React.CSSProperties;

interface Props {
  toGoals: () => void;
  toGoal: (goal: BigGoal) => void;
  toGroups: () => void;
}

export default function OverviewSection({ toGoals, toGoal, toGroups }: Props) {
  const onNavigate = (section: string) => {
    if (section === "groups") { toGroups(); return; }
    toGoals();
  };
  const [stats, setStats]     = useState<DashboardStats | null>(null);
  const [goals, setGoals]     = useState<BigGoal[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [user, setUser]       = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    Promise.all([
      getDashboard(),
      getBigGoals(),
      getSubjects(),
      token ? getMe(token).catch(() => null) : Promise.resolve(null),
    ])
      .then(([dash, g, s, me]) => {
        setStats(dash); setGoals(g.slice(0, 3)); setSubjects(s); setUser(me);
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
        {[380, 80, 320].map((h, i) => (
          <div key={i} className="rounded-2xl animate-pulse" style={{ height: h, background: "rgba(255,255,255,0.04)" }} />
        ))}
      </div>
    );
  }

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
        <button onClick={() => onNavigate("subjects")}
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

            {/* Recent Activity — show if sessions exist, else show example chips */}
            {stats && stats.recent_sessions.length > 0 ? (
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
            ) : (
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

            <button onClick={() => onNavigate("goals")}
              className="self-start flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-500 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              Create Mission
            </button>
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

      {/* ③  KEY STATS */}
      <div className="mb-6">
        {/* 4 key stat pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Subjects",        value: stats?.subjects_count ?? 0,            color: "#818cf8", nav: "subjects" },
            { label: "Active Missions", value: stats?.active_big_goals_count ?? 0,    color: "#a78bfa", nav: "goals"    },
            { label: "Pending Tasks",   value: stats?.pending_micro_goals_count ?? 0, color: "#c084fc", nav: "goals"    },
            { label: "Workspaces",      value: stats?.active_workspaces_count ?? 0,   color: "#10B981", nav: "subjects" },
          ].map(s => (
            <button key={s.label} onClick={() => onNavigate(s.nav)}
              className="p-4 rounded-xl text-left transition-all hover:scale-[1.02] active:scale-95"
              style={{ ...glass }}>
              <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-1 font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>{s.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ③④⑤⑥  BENTO GRID */}
      <div className="grid grid-cols-12 gap-6">

        {/* ── Left col (8/12) ── */}
        <div className="col-span-12 lg:col-span-8 space-y-6">

          {/* ③ PRIORITY ACTION — what to do right now */}
          <div className="p-6 rounded-2xl relative overflow-hidden" style={{
            background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(2,6,23,0.95))",
            border: "1px solid rgba(99,102,241,0.25)",
            boxShadow: "0 0 40px -10px rgba(99,102,241,0.2)",
          }}>
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl pointer-events-none" style={{ background: "rgba(99,102,241,0.1)" }} />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#a78bfa" }} />
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#a78bfa" }}>
                    {stats && stats.pending_micro_goals_count > 0 ? "Immediate Task" : "Next Step"}
                  </span>
                </div>
                <h4 className="text-2xl font-bold text-white mb-2">
                  {stats && stats.pending_micro_goals_count > 0
                    ? `${stats.pending_micro_goals_count} task${stats.pending_micro_goals_count !== 1 ? "s" : ""} pending`
                    : goals.length > 0 ? goals[0].title : "Create your first Mission"}
                </h4>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {stats && stats.pending_micro_goals_count > 0
                    ? "You have pending micro-goals. Keep the momentum going."
                    : goals.length > 0
                      ? "Pick up where you left off and keep making progress."
                      : "Define what you want to achieve and let AI build your plan."}
                </p>
              </div>
              <button onClick={() => goals.length > 0 ? toGoal(goals[0]) : toGoals()}
                className="flex-shrink-0 px-8 py-4 rounded-xl font-black text-sm uppercase tracking-wider transition-colors"
                style={{ background: "white", color: "black", minWidth: 160 }}
                onMouseEnter={e => (e.currentTarget.style.background = "#a78bfa")}
                onMouseLeave={e => (e.currentTarget.style.background = "white")}>
                {goals.length > 0 ? "Launch Session" : "Create Mission"}
              </button>
            </div>
          </div>

          {/* ④ MISSIONS PROGRESS */}
          <div className="p-6 rounded-2xl" style={glass}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-white">Missions Progress</h3>
              <button onClick={() => onNavigate("goals")} className="text-xs font-bold" style={{ color: "#818cf8" }}>View all</button>
            </div>
            {goals.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>No missions yet — create one to track your progress.</p>
                <button onClick={() => onNavigate("goals")} className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                  New Mission
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {goals.map((goal, i) => {
                  const color = COLORS[i % COLORS.length];
                  const days = daysLeft(goal.deadline);
                  return (
                    <div key={goal.id} className="p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.02]"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.05)" }}
                      onClick={() => toGoal(goal)}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = `${color}50`)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)")}>
                      <div className="relative w-16 h-16 mb-3 mx-auto">
                        <CircleProgress pct={goal.progress_pct} color={color} />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">{goal.progress_pct}%</span>
                      </div>
                      <p className="text-center text-sm font-bold text-white truncate">{goal.title}</p>
                      {days && <p className="text-center text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{days}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ⑤ SUBJECT WORKSPACES */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Subject Workspaces</h3>
              <button onClick={() => onNavigate("subjects")} className="text-xs font-bold" style={{ color: "#818cf8" }}>View all</button>
            </div>
            {subjects.length === 0 ? (
              <div className="p-6 rounded-2xl flex flex-col items-center gap-3 py-8" style={glass}>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>No subjects yet.</p>
                <button onClick={() => onNavigate("subjects")} className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                  Add Subject
                </button>
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                {subjects.map((s, i) => {
                  const accent = COLORS[i % COLORS.length];
                  return (
                    <button key={s.id} onClick={() => onNavigate("subjects")}
                      className="min-w-[160px] rounded-2xl p-5 flex flex-col justify-end relative overflow-hidden group flex-shrink-0 text-left"
                      style={{ ...glass, aspectRatio: "4/5" }}>
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: `radial-gradient(circle at 50% 80%, ${accent}1a, transparent 70%)` }} />
                      <div className="absolute inset-x-0 bottom-0 h-20"
                        style={{ background: "linear-gradient(to top, rgba(11,11,30,0.9), transparent)" }} />
                      <div className="relative z-10">
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: accent }}>Subject</p>
                        <h4 className="text-sm font-bold text-white leading-tight">{s.name}</h4>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right col (4/12) ── */}
        <div className="col-span-12 lg:col-span-4 space-y-5">

          {/* Library stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Documents",  value: stats?.documents_count ?? 0,       color: "#22d3ee", nav: "library" },
              { label: "Flashcards", value: stats?.flashcard_decks_count ?? 0, color: "#10B981", nav: "library" },
              { label: "Quiz Sets",  value: stats?.quiz_sets_count ?? 0,       color: "#a78bfa", nav: "library" },
              { label: "Notes",      value: stats?.notes_count ?? 0,           color: "#818cf8", nav: "library" },
            ].map(stat => (
              <button key={stat.label} onClick={() => onNavigate(stat.nav)}
                className="p-4 rounded-xl text-left transition-all hover:scale-[1.02] active:scale-95"
                style={glass}>
                <p className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-[11px] mt-1 font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>{stat.label}</p>
              </button>
            ))}
          </div>
        </div>
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
            <button onClick={() => onNavigate("library")}
              className="px-4 py-2 rounded-lg text-xs font-bold transition-colors"
              style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,0.28)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(99,102,241,0.15)")}>
              Upload Docs
            </button>
          </div>
        </div>
      </div>

      <div className="h-24" />
    </div>
  );
}
