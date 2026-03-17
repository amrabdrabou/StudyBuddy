import { useEffect, useState } from "react";
import { getDashboard, type DashboardStats, type RecentSession } from "../api/dashboard";
import { getBigGoals, type BigGoal } from "../api/big_goals";
import { getMe, getToken, type UserResponse } from "../api/auth";
import StatCard from "../components/dashboard/StatCard";
import ErrorBanner from "../components/ui/ErrorBanner";
import { Spotlight } from "../components/ui/spotlight";
import { SplineScene } from "../components/ui/splite";
import homeBackground from "../assets/home.png";

function SessionRow({ s }: { s: RecentSession }) {
  const color: Record<string, string> = {
    active: "text-emerald-400", paused: "text-amber-400",
    completed: "text-blue-400", abandoned: "text-red-400",
  };
  return (
    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
      <div className="w-2 h-2 rounded-full bg-violet-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{s.title ?? "Study Session"}</p>
        <p className="text-xs text-gray-500">{new Date(s.started_at).toLocaleDateString()}</p>
      </div>
      <span className={`text-xs font-medium ${color[s.status] ?? "text-gray-400"}`}>{s.status}</span>
    </div>
  );
}

interface Props {
  onNavigate: (section: string) => void;
}

export default function OverviewSection({ onNavigate }: Props) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [lastMission, setLastMission] = useState<BigGoal | null | undefined>(undefined);
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getToken();
    Promise.all([
      getDashboard(),
      getBigGoals(),
      token ? getMe(token).catch(() => null) : Promise.resolve(null),
    ])
      .then(([dash, goals, me]) => {
        setStats(dash);
        setUser(me);
        const sorted = [...goals].sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
        setLastMission(sorted[0] ?? null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-white/5 rounded-xl animate-pulse w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* ── Hero section (no card boundary) ── */}
      <div className="relative overflow-hidden bg-slate-950" style={{ minHeight: "calc(100vh - 64px)" }}>

          {/* Background image — same treatment as the homepage */}
          <div className="absolute inset-0 z-0">
            <img src={homeBackground} alt="" className="w-full h-full object-cover opacity-40" />
            {/* Fade: transparent top → slate-950 bottom so stats below blend in */}
            <div className="absolute inset-0"
              style={{ background: "linear-gradient(to bottom, rgba(2,6,23,0.25) 0%, rgba(2,6,23,0.55) 45%, #020617 100%)" }} />
          </div>

          {/* Soft color glows on top of the image */}
          <div className="pointer-events-none absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full blur-[110px] opacity-25"
            style={{ background: "radial-gradient(circle, #6d28d9, transparent 70%)" }} />
          <div className="pointer-events-none absolute -bottom-24 -right-24 w-[380px] h-[380px] rounded-full blur-[100px] opacity-20"
            style={{ background: "radial-gradient(circle, #0e7490, transparent 70%)" }} />
          <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full blur-[130px] opacity-15"
            style={{ background: "radial-gradient(circle, #7c3aed, transparent 70%)" }} />

          <Spotlight className="-top-40 -left-10 md:left-20 md:-top-24" fill="#c4b5fd" />

          <div className="relative z-10 flex flex-col md:flex-row h-full" style={{ minHeight: "calc(100vh - 64px)" }}>

            {/* ── Left panel ── */}
            <div className="relative px-10 py-12 md:w-[55%] flex flex-col justify-center gap-6">
              {/* Left-edge accent bar */}
              <div className="absolute left-0 top-12 bottom-12 w-[3px] rounded-full"
                style={{ background: "linear-gradient(to bottom, #7c3aed, #ec4899, #06b6d4)" }} />

              {lastMission ? (
                <>
                  {/* Greeting */}
                  <div>
                    <h2 className="text-5xl sm:text-6xl font-extrabold tracking-tighter text-white leading-[1.1]">
                      {user?.first_name || user?.username || "Scholar"}!<br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500">
                        You're on a 5-day streak.
                      </span>
                    </h2>
                  </div>

                  {/* Divider */}
                  <div className="h-px w-16 rounded-full" style={{ background: "linear-gradient(to right, #7c3aed, transparent)" }} />

                  {/* Mission */}
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-purple-400 font-semibold text-sm uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                      Current Focus
                    </span>
                    <h3 className="text-3xl font-bold text-white mt-2 leading-tight line-clamp-2">
                      {lastMission.title}
                    </h3>
                    <p className="text-slate-400 mt-3 text-sm leading-relaxed max-w-sm">
                      {lastMission.description
                        ? lastMission.description
                        : `You're ${lastMission.progress_pct}% through this mission. Ready to keep going?`}
                    </p>

                    {/* Progress */}
                    <div className="mt-4 max-w-xs">
                      <div className="flex justify-between text-[11px] font-semibold mb-1.5">
                        <span style={{ color: "#6b7280" }}>Progress</span>
                        <span className="text-purple-400">{lastMission.progress_pct}%</span>
                      </div>
                      <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
                        <div className="h-1 rounded-full"
                          style={{ width: `${lastMission.progress_pct}%`, background: "linear-gradient(90deg, #7c3aed, #ec4899)" }} />
                      </div>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 flex-wrap">
                    <button onClick={() => onNavigate("subjects")}
                      className="relative overflow-hidden flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-105 active:scale-95"
                      style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", boxShadow: "0 0 30px rgba(124,58,237,0.5), 0 4px 15px rgba(124,58,237,0.3)" }}>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      Start Session
                    </button>
                    <button onClick={() => onNavigate("library")}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-105 active:scale-95"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" }}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                      </svg>
                      View Materials
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Greeting */}
                  <h2 className="text-5xl sm:text-6xl font-extrabold tracking-tighter text-white leading-[1.1]">
                    {user?.first_name || user?.username || "Scholar"}!<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500">
                      You're on a 5-day streak.
                    </span>
                  </h2>

                  <div className="h-px w-16 rounded-full" style={{ background: "linear-gradient(to right, #7c3aed, transparent)" }} />

                  {/* CTA */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#a78bfa" }}>
                      Where every journey begins
                    </p>
                    <h3 className="text-3xl font-extrabold text-white leading-tight">
                      Define Your{" "}
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-400">
                        Mission
                      </span>
                    </h3>
                    <p className="text-sm mt-3 leading-relaxed max-w-sm" style={{ color: "#94a3b8" }}>
                      Start with a Mission — your big learning goal. Everything else builds from here.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {[
                      { text: "Become an AI Engineer",        color: "#a78bfa" },
                      { text: "Pass the Linear Algebra exam", color: "#22d3ee" },
                      { text: "Learn Python",                 color: "#34d399" },
                    ].map(ex => (
                      <div key={ex.text}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
                        style={{ background: `${ex.color}0e`, border: `1px solid ${ex.color}22` }}>
                        <div className="w-2 h-2 rounded-full flex-shrink-0 shadow-lg" style={{ background: ex.color, boxShadow: `0 0 8px ${ex.color}` }} />
                        <span className="text-sm font-medium text-white">{ex.text}</span>
                      </div>
                    ))}
                  </div>

                  <button onClick={() => onNavigate("goals")}
                    className="self-start flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-105 active:scale-95"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", boxShadow: "0 0 30px rgba(124,58,237,0.5), 0 4px 15px rgba(124,58,237,0.3)" }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                    </svg>
                    Create Mission
                  </button>
                </>
              )}
            </div>

            {/* ── Right: Spline robot — full height ── */}
            <div className="flex-1 relative">
              {/* Fade from left so robot blends into page background */}
              <div className="absolute inset-y-0 left-0 w-40 z-10 pointer-events-none"
                style={{ background: "linear-gradient(to right, #020617, transparent)" }} />
              <SplineScene
                scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                className="w-full h-full absolute inset-0"
              />
            </div>
          </div>
      </div>

      <div className="bg-slate-950 px-6 lg:px-10 py-8 max-w-7xl mx-auto w-full space-y-8">

      {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Subjects"           value={stats?.subjects_count ?? 0}            accent="text-violet-400" />
        <StatCard label="Active Workspaces"  value={stats?.active_workspaces_count ?? 0}   accent="text-emerald-400" />
        <StatCard label="Active Missions"     value={stats?.active_big_goals_count ?? 0}    accent="text-amber-400" />
        <StatCard label="Pending Tasks"      value={stats?.pending_micro_goals_count ?? 0} accent="text-cyan-400" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Documents"       value={stats?.documents_count ?? 0}       accent="text-cyan-400" />
        <StatCard label="Flashcard Decks" value={stats?.flashcard_decks_count ?? 0} accent="text-emerald-400" />
        <StatCard label="Quiz Sets"       value={stats?.quiz_sets_count ?? 0}       accent="text-amber-400" />
        <StatCard label="Notes"           value={stats?.notes_count ?? 0}           accent="text-violet-400" />
      </div>

      {stats && stats.recent_sessions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Recent Sessions</h2>
          <div className="space-y-2">
            {stats.recent_sessions.map(s => <SessionRow key={s.id} s={s} />)}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Quick Access</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Subjects",   section: "subjects",   cls: "bg-violet-500/10 text-violet-400 hover:bg-violet-500/20",   icon: "📚" },
            { label: "Workspaces", section: "workspaces", cls: "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20", icon: "🗂️" },
            { label: "Missions",   section: "goals",      cls: "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20",       icon: "🚀" },
            { label: "Settings",   section: "settings",   cls: "bg-slate-500/10 text-slate-300 hover:bg-slate-500/20",       icon: "⚙️" },
          ].map(item => (
            <button key={item.section} onClick={() => onNavigate(item.section)}
              className={`p-4 rounded-xl text-left transition-colors ${item.cls}`}>
              <p className="text-xl mb-1">{item.icon}</p>
              <p className="text-sm font-medium">{item.label}</p>
            </button>
          ))}
        </div>
      </div>

      </div>
    </div>
  );
}
