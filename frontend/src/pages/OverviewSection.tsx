import { useEffect, useState } from "react";
import { getDashboard, type RecentSession } from "../api/dashboard";
import { getBigGoals, type BigGoal } from "../api/big_goals";
import { getSubjects } from "../api/subjects";
import { getMe, getToken, type UserResponse } from "../api/auth";
import { ActionCard, ActionSection } from "../components/overview/ActionCard";
import { SplineScene } from "../components/ui/splite";
import { useNavStore } from "../store/navStore";


const HERO_COLORS = ["#818cf8", "#a78bfa", "#c084fc", "#e879f9", "#f0abfc"];

export default function OverviewSection() {
  const {
    toGoals, toGoal,
    toSubjectsView, toWorkspacesView, toDocumentsView,
    toSessionsView, toFlashcardsView, toQuizzesView, toNotesView,
    toWorkspace, recentWorkspaces,
    initForUser, removeStaleEntries,
  } = useNavStore();

  const [stats, setStats] = useState<import("../api/dashboard").DashboardStats | null>(null);
  const [goals, setGoals] = useState<BigGoal[]>([]);
  const [allGoalIds, setAllGoalIds] = useState<Set<string>>(new Set());
  const [user,  setUser]  = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const token = getToken();
    Promise.all([
      getDashboard(), getBigGoals(), getSubjects(),
      token ? getMe(token).catch(() => null) : Promise.resolve(null),
    ])
      .then(([dash, g, _s, me]) => {
        setStats(dash);
        const goalIds = new Set<string>(g.map((goal: BigGoal) => goal.id));
        setAllGoalIds(goalIds);
        setGoals(g.slice(0, 3));
        setUser(me);

        // Switch to per-user recent history and purge stale entries
        if (me?.id) {
          initForUser(me.id);
          // workspaces are nested under subjects; collect all workspace IDs from goals' subjects
          // We don't have workspace IDs here, so we only validate by goal existence for now
          removeStaleEntries(goalIds, new Set()); // empty set = skip workspace-level check
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [initForUser, removeStaleEntries]);

  const userName  = user?.first_name || user?.username || "Scholar";
  const h         = now.getHours();
  const greeting  = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const today     = now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  const timeStr   = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  // Only use a cached workspace if its parent goal still exists on the backend
  const continueWs = recentWorkspaces.find(ws => allGoalIds.has(ws.goal.id)) ?? null;
  const lastSession = stats?.recent_sessions?.[0];
  const lastLabel   = lastSession
    ? new Date(lastSession.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <div className="rounded-3xl animate-pulse" style={{ height: 480, background: "rgba(255,255,255,0.04)" }} />
        <div className="space-y-8 mt-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <div className="rounded-xl animate-pulse" style={{ height: 40, width: 200, background: "rgba(255,255,255,0.04)", animationDelay: `${i * 0.1}s` }} />
              <div className="rounded-2xl animate-pulse" style={{ height: 380, background: "rgba(255,255,255,0.04)", animationDelay: `${i * 0.1 + 0.05}s` }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Derived stats ──────────────────────────────────────────────────────────

  const missionsVal   = stats?.active_big_goals_count ?? 0;
  const pendingTasks  = stats?.pending_micro_goals_count ?? 0;
  const missionProgressList = stats?.mission_progress ?? [];
  const avgMissionProgress  = missionProgressList.length > 0
    ? Math.round(missionProgressList.reduce((s, m) => s + m.progress_pct, 0) / missionProgressList.length)
    : undefined;

  const subjectsVal   = stats?.subjects_count ?? 0;
  const workspacesVal = stats?.active_workspaces_count ?? 0;
  const documentsVal  = stats?.documents_count ?? 0;
  const notesVal      = stats?.notes_count ?? 0;
  const sessionsVal   = stats?.recent_sessions?.length ?? 0;
  const flashcardsVal = stats?.flashcard_decks_count ?? 0;
  const quizzesVal    = stats?.quiz_sets_count ?? 0;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="pb-28" style={{ fontFamily: "'Lexend', sans-serif" }}>
      <style>{`
        @keyframes catSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .cat-section { animation: catSlideUp 0.6s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>

      {/* ── Hero card ── */}
      <div className="w-full mb-8 relative" style={{ minHeight: 520 }}>
        <div className="relative" style={{ minHeight: 520 }}>

          {/* Content — full width, sits behind the robot */}
          <div className="relative z-0 px-10 py-10 flex flex-col justify-center gap-5" style={{ minHeight: 520 }}>

            {/* Greeting + clock */}
            <div className="relative z-10 flex items-center justify-between flex-wrap gap-2 mb-2">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-70" style={{ background: "#34d399" }} />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "#34d399" }} />
                  </span>
                  <p className="text-[11px] tabular-nums" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {today}&nbsp;·&nbsp;<span style={{ letterSpacing: "0.05em" }}>{timeStr}</span>
                  </p>
                </div>
                <h2 className="text-4xl font-black tracking-tight leading-tight">
                  <span className="text-white">{greeting}, </span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 via-violet-400 to-fuchsia-400"
                    style={{ filter: "drop-shadow(0 0 18px rgba(167,139,250,0.55))" }}>
                    {userName}
                  </span>
                </h2>
              </div>
            </div>

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-indigo-500/10 px-3 py-1 rounded-full mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                </span>
                <span className="text-xs font-semibold text-indigo-300">
                  {goals.length > 0 ? "Keep the momentum" : "Where every journey begins"}
                </span>
              </div>
              <h2 className="mt-4 max-w-4xl text-6xl md:text-7xl xl:text-[5.25rem] font-extrabold tracking-tighter text-white leading-[0.9]">
                {goals.length > 0 ? (
                  <>Continue Your{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-500">Journey</span>
                  </>
                ) : (
                  <>Define Your{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-500">Mission</span>
                  </>
                )}
              </h2>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-gray-300">
                {goals.length > 0
                  ? stats && stats.pending_micro_goals_count > 0
                    ? `You have ${stats.pending_micro_goals_count} pending task${stats.pending_micro_goals_count !== 1 ? "s" : ""} — pick up where you left off.`
                    : "You're making progress — keep the streak alive and reach your goals."
                  : "Start with a Mission — your big learning goal. Everything else builds from here."}
              </p>
            </div>

            {/* Activity / goals list */}
            <div className="relative z-10 max-w-sm">
              {goals.length > 0 && stats && stats.recent_sessions.length > 0 ? (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-3"
                    style={{ color: "rgba(255,255,255,0.3)" }}>Recent Activity</p>
                  <div className="flex flex-col gap-2">
                    {stats.recent_sessions.slice(0, 3).map((s: RecentSession, i: number) => {
                      const c = HERO_COLORS[i % HERO_COLORS.length];
                      return (
                        <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-xl"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c }} />
                          <p className="text-sm font-semibold text-white truncate">{s.title ?? "Study Session"}</p>
                          <p className="text-[10px] ml-auto flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>
                            {new Date(s.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · <span className="capitalize">{s.status}</span>
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : goals.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  {goals.slice(0, 3).map((g, i) => {
                    const c = HERO_COLORS[i % HERO_COLORS.length];
                    return (
                      <div key={g.id}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer"
                        style={{ background: `${c}0e`, border: `1px solid ${c}25` }}
                        onClick={() => toGoal(g)}
                      >
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c }} />
                        <span className="text-sm font-medium text-white truncate">{g.title}</span>
                        <span className="ml-auto text-[10px] font-bold flex-shrink-0" style={{ color: c }}>{g.progress_pct}%</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {[
                    { text: "Become an AI Engineer",        color: "#818cf8" },
                    { text: "Pass the Linear Algebra exam", color: "#a78bfa" },
                    { text: "Learn Python",                 color: "#c084fc" },
                  ].map(ex => (
                    <div key={ex.text} className="flex items-center gap-3 px-3 py-2 rounded-xl"
                      style={{ background: `${ex.color}0e`, border: `1px solid ${ex.color}25` }}>
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: ex.color }} />
                      <span className="text-sm font-medium text-white">{ex.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="relative z-10">
              {continueWs ? (
                <button
                  onClick={() => toWorkspace(continueWs.goal, continueWs.subject, continueWs.workspace)}
                  className="self-start flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition-all hover:brightness-110 active:scale-95"
                  style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 4px 20px rgba(79,70,229,0.4)" }}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  Continue Journey
                </button>
              ) : goals.length > 0 ? (
                <button
                  onClick={() => toGoal(goals[0])}
                  className="self-start flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition-all hover:brightness-110 active:scale-95"
                  style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 4px 20px rgba(79,70,229,0.4)" }}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  Start Learning
                </button>
              ) : (
                <button
                  onClick={toGoals}
                  className="self-start flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-500 transition-colors active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                  </svg>
                  Create Mission
                </button>
              )}
            </div>
          </div>

          {/* Robot — absolute on right, floats over content */}
          <div className="absolute inset-y-0 right-0 z-10" style={{ width: "52%" }}>
            <SplineScene
              scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </div>
      </div>

      {/* ── Action card sections ── */}
      <div className="mx-auto px-8 pb-6" style={{ maxWidth: "89.6rem" }}>
        <div className="space-y-8">

          {/* ── Strategy ── */}
          <div className="cat-section" style={{ animationDelay: "0.05s" }}>
            <ActionSection
              label="Strategy"
              tagline="Define goals, organise subjects and set up workspaces"
              color="#818cf8"
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>}
            >
              <div className="grid grid-cols-3 gap-4">
                <ActionCard
                  color="#818cf8"
                  icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                  title="Missions"
                  description={missionsVal === 0 ? "Set your first learning goal" : `${missionsVal} active`}
                  metric={missionsVal}
                  status={missionsVal === 0
                    ? "Create your first mission"
                    : pendingTasks > 0
                      ? `${pendingTasks} task${pendingTasks !== 1 ? "s" : ""} pending`
                      : "All caught up"}
                  progress={avgMissionProgress}
                  ctaLabel={missionsVal === 0 ? "Create Mission" : "View Missions"}
                  onAction={toGoals}
                  onNew={toGoals}
                />
                <ActionCard
                  color="#a78bfa"
                  icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
                  title="Subjects"
                  description="Topics to master"
                  metric={subjectsVal}
                  status={subjectsVal === 0 ? "None yet" : `${subjectsVal} tracked`}
                  ctaLabel="View Subjects"
                  onAction={toSubjectsView}
                  onNew={toSubjectsView}
                />
                <ActionCard
                  color="#10B981"
                  icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
                  title="Workspaces"
                  description="Study environments"
                  metric={workspacesVal}
                  status={workspacesVal > 0 ? "Currently active" : "None active"}
                  ctaLabel="View Workspaces"
                  onAction={toWorkspacesView}
                  onNew={toWorkspacesView}
                />
              </div>
            </ActionSection>
          </div>

          <div style={{ height: 1, background: "rgba(255,255,255,0.04)" }} />

          {/* ── Resources + Practice side-by-side ── */}
          <div className="cat-section grid gap-8" style={{ animationDelay: "0.15s", gridTemplateColumns: "1fr 2fr" }}>

            {/* Resources */}
            <ActionSection
              label="Resources"
              tagline="Documents and notes for AI"
              color="#f59e0b"
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>}
            >
              <div className="grid grid-cols-1 gap-4">
                <ActionCard
                  color="#fb923c"
                  icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                  title="Documents"
                  description="Uploaded materials"
                  metric={documentsVal}
                  status={documentsVal > 0 ? "Ready for AI" : "Upload to start"}
                  ctaLabel="View Documents"
                  onAction={toDocumentsView}
                  onNew={toDocumentsView}
                />
                <ActionCard
                  color="#f59e0b"
                  icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
                  title="Notes"
                  description="Captured insights"
                  metric={notesVal}
                  status={notesVal > 0 ? `${notesVal} saved` : "Start writing"}
                  ctaLabel="View Notes"
                  onAction={toNotesView}
                  onNew={toNotesView}
                />
              </div>
            </ActionSection>

            {/* Vertical separator + Practice */}
            <div className="flex gap-8">
              <div style={{ width: 1, background: "rgba(255,255,255,0.04)", flexShrink: 0 }} />
              <div className="flex-1">
                <ActionSection
                  label="Practice"
                  tagline="Sessions, flashcards and quizzes"
                  color="#34d399"
                  icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                >
                  <div className="grid grid-cols-2 gap-4" style={{ gridAutoRows: "minmax(0, auto)" }}>
                    <ActionCard
                      color="#34d399"
                      icon={<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>}
                      title="Sessions"
                      description="Study time logged"
                      metric={sessionsVal}
                      status={lastLabel ? `Last session · ${lastLabel}` : "No sessions yet"}
                      ctaLabel="Start Session"
                      onAction={toSessionsView}
                      onNew={toSessionsView}
                      span
                    />
                    <ActionCard
                      color="#2dd4bf"
                      icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
                      title="Flashcards"
                      description="AI-generated decks"
                      metric={flashcardsVal}
                      status={flashcardsVal > 0 ? "Ready to review" : "Generate from docs"}
                      ctaLabel="Review Cards"
                      onAction={toFlashcardsView}
                      onNew={toFlashcardsView}
                    />
                    <ActionCard
                      color="#22d3ee"
                      icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
                      title="Quiz Sets"
                      description="Knowledge tests"
                      metric={quizzesVal}
                      status={quizzesVal > 0 ? "Test yourself" : "Create a quiz"}
                      ctaLabel="Take Quiz"
                      onAction={toQuizzesView}
                      onNew={toQuizzesView}
                    />
                  </div>
                </ActionSection>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


