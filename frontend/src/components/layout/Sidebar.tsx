import { useEffect, useState } from "react";
import { getMe, getToken, type UserResponse } from "../../api/auth";
import { useNavStore } from "../../store/navStore";
import type { NavView } from "../../store/navStore";
export type { NavView, NavState } from "../../store/navStore";

// Workflow step definitions: two trees — Plan and Review
const PLAN_STEPS: { step: string; label: string; color: string; depth: number; view: NavView }[] = [
  { step: "01", label: "Missions",   color: "#818cf8", depth: 0, view: "goals" },
  { step: "02", label: "Subjects",   color: "#a78bfa", depth: 1, view: "subjects" },
  { step: "03", label: "Workspaces", color: "#10B981", depth: 2, view: "workspaces" },
  { step: "04", label: "Documents",  color: "#22d3ee", depth: 3, view: "documents" },
  { step: "05", label: "Summaries",  color: "#06b6d4", depth: 3, view: "summary" },
  { step: "06", label: "Roadmap",    color: "#8b5cf6", depth: 3, view: "roadmap" },
];

const REVIEW_STEPS: { step: string; label: string; color: string; depth: number; view: NavView }[] = [
  { step: "07", label: "Sessions",   color: "#34d399", depth: 0, view: "sessions" },
  { step: "08", label: "Flashcards", color: "#f59e0b", depth: 1, view: "flashcards" },
  { step: "09", label: "Quiz Sets",  color: "#f97316", depth: 1, view: "quizzes" },
  { step: "10", label: "Notes",      color: "#ec4899", depth: 1, view: "notes" },
];

const INDENT = [0, 14, 28, 42]; // px per depth level

export default function Sidebar({ onSignOut }: { onSignOut: () => Promise<void> }) {
  const { navState, navDirect, toGoal, toSubject } = useNavStore();
  const isDeep = ["goal", "subject", "workspace"].includes(navState.view);
  const goalColor = navState.goal?.cover_color ?? "#6366f1";

  const [user, setUser] = useState<UserResponse | null>(null);
  useEffect(() => {
    const token = getToken();
    if (token) getMe(token).then(setUser).catch(() => {});
  }, []);

  const displayName = user
    ? (user.first_name ? `${user.first_name}${user.last_name ? " " + user.last_name : ""}` : (user.username ?? user.email))
    : "…";
  const initials = user
    ? (user.first_name?.[0] ?? user.username?.[0] ?? user.email[0]).toUpperCase()
    : "?";
  const rootActive = isDeep ? "goals" : navState.view;

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-60 flex flex-col z-50 overflow-y-auto"
      style={{ background: "#070d18", borderRight: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* ── Logo ── */}
      <div className="px-5 pt-6 pb-4 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <img src="/assets/Logomark_final3.svg" alt="StudyBuddy" className="w-7 h-7" />
          <h1 className="text-xl font-extrabold tracking-tighter text-white" style={{ fontFamily: "'Lexend',sans-serif" }}>
            Study<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Buddy</span>
          </h1>
        </div>
      </div>

      <div className="mx-4 mb-3 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />

      {/* ── Overview ── */}
      <div className="px-3 flex-shrink-0">
        <button
          onClick={() => navDirect({ view: "overview" })}
          className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left transition-all"
          style={{
            color: rootActive === "overview" ? "white" : "rgba(255,255,255,0.4)",
            background: rootActive === "overview" ? "rgba(99,102,241,0.12)" : "transparent",
            fontFamily: "'Lexend',sans-serif",
          }}
          onMouseEnter={e => { if (rootActive !== "overview") e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
          onMouseLeave={e => { if (rootActive !== "overview") e.currentTarget.style.background = "transparent"; }}
        >
          {rootActive === "overview" && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full" style={{ background: "#818cf8" }} />
          )}
          <span style={{ color: rootActive === "overview" ? "#818cf8" : "rgba(255,255,255,0.3)" }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
          </span>
          Overview
        </button>
      </div>

      <div className="mx-4 my-3 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />

      {/* ── Workflow Steps ── */}
      <div className="px-3 flex-shrink-0">
        <p className="text-[9px] font-bold uppercase tracking-widest px-3 mb-2" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "'Lexend',sans-serif" }}>
          Plan
        </p>

        {/* Relative container for connecting lines */}
        <div className="relative">
          {/* Vertical connector for Plan tree */}
          <div className="absolute w-px" style={{
            left: 18, top: 12, bottom: 12,
            background: "rgba(255,255,255,0.06)",
          }} />

          {PLAN_STEPS.map(s => {
            const isActive = rootActive === s.view;
            return (
              <button
                key={s.step}
                onClick={() => navDirect({ view: s.view })}
                className="relative flex items-center gap-2 py-1.5 pr-2 rounded-lg w-full text-left transition-all group"
                style={{
                  paddingLeft: INDENT[s.depth] + 8,
                  color: isActive ? "white" : "rgba(255,255,255,0.4)",
                  fontFamily: "'Lexend',sans-serif",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                {/* Step dot */}
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0 relative z-10"
                  style={{ background: s.color, boxShadow: isActive ? `0 0 6px ${s.color}` : "none" }}
                />
                <span className="text-[9px] font-bold flex-shrink-0" style={{ color: `${s.color}90` }}>
                  {s.step}
                </span>
                <span className="text-xs font-medium truncate">{s.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mx-0 my-2 h-px" style={{ background: "rgba(255,255,255,0.04)" }} />

        <p className="text-[9px] font-bold uppercase tracking-widest px-3 mb-2 mt-3" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "'Lexend',sans-serif" }}>
          Study & Review
        </p>

        <div className="relative">
          {/* Vertical connector for Review tree */}
          <div className="absolute w-px" style={{
            left: 18, top: 12, bottom: 12,
            background: "rgba(255,255,255,0.06)",
          }} />

          {REVIEW_STEPS.map(s => {
            const isActive = rootActive === s.view;
            return (
              <button
                key={s.step}
                onClick={() => navDirect({ view: s.view })}
                className="relative flex items-center gap-2 py-1.5 pr-2 rounded-lg w-full text-left transition-all"
                style={{
                  paddingLeft: INDENT[s.depth] + 8,
                  color: isActive ? "white" : "rgba(255,255,255,0.4)",
                  fontFamily: "'Lexend',sans-serif",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0 relative z-10"
                  style={{ background: s.color, boxShadow: isActive ? `0 0 6px ${s.color}` : "none" }}
                />
                <span className="text-[9px] font-bold flex-shrink-0" style={{ color: `${s.color}90` }}>
                  {s.step}
                </span>
                <span className="text-xs font-medium truncate">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mx-4 my-3 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />

      {/* ── Groups ── */}
      <div className="px-3 flex-shrink-0">
        <button
          onClick={() => navDirect({ view: "groups" })}
          className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left transition-all"
          style={{
            color: rootActive === "groups" ? "white" : "rgba(255,255,255,0.4)",
            background: rootActive === "groups" ? "rgba(99,102,241,0.12)" : "transparent",
            fontFamily: "'Lexend',sans-serif",
          }}
          onMouseEnter={e => { if (rootActive !== "groups") e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
          onMouseLeave={e => { if (rootActive !== "groups") e.currentTarget.style.background = "transparent"; }}
        >
          {rootActive === "groups" && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full" style={{ background: "#818cf8" }} />
          )}
          <span style={{ color: rootActive === "groups" ? "#818cf8" : "rgba(255,255,255,0.3)" }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
          </span>
          Study Groups
        </button>
      </div>

      {/* ── Breadcrumb trail (deep navigation) ── */}
      {isDeep && navState.goal && (
        <>
          <div className="mx-4 my-3 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
          <div className="px-4 flex-shrink-0">
            <p className="text-[9px] font-bold uppercase tracking-widest mb-2.5" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "'Lexend',sans-serif" }}>
              Current Path
            </p>
            <div className="relative">
              {/* Vertical connector */}
              <div className="absolute left-3 top-5 w-px"
                style={{ bottom: navState.workspace ? "2.5rem" : navState.subject ? "1.75rem" : "0", background: `${goalColor}28` }} />

              <button
                onClick={() => toGoal(navState.goal!)}
                className="flex items-center gap-2.5 w-full px-2 py-2 rounded-xl text-left transition-all"
                style={{ color: navState.view === "goal" ? "white" : "rgba(255,255,255,0.5)", background: navState.view === "goal" ? `${goalColor}18` : "transparent" }}
                onMouseEnter={e => { if (navState.view !== "goal") e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { if (navState.view !== "goal") e.currentTarget.style.background = "transparent"; }}
              >
                <span className="text-sm flex-shrink-0 relative z-10">{navState.goal.icon ?? "🎯"}</span>
                <span className="text-xs font-semibold truncate" style={{ fontFamily: "'Lexend',sans-serif" }}>{navState.goal.title}</span>
              </button>

              {navState.subject && (
                <button
                  onClick={() => toSubject(navState.goal!, navState.subject!)}
                  className="flex items-center gap-2.5 w-full pl-7 pr-2 py-2 rounded-xl text-left transition-all"
                  style={{ color: navState.view === "subject" ? "white" : "rgba(255,255,255,0.4)", background: navState.view === "subject" ? "rgba(255,255,255,0.06)" : "transparent" }}
                  onMouseEnter={e => { if (navState.view !== "subject") e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={e => { if (navState.view !== "subject") e.currentTarget.style.background = "transparent"; }}
                >
                  <span className="text-xs flex-shrink-0 relative z-10">{navState.subject.icon ?? "📚"}</span>
                  <span className="text-xs font-medium truncate" style={{ fontFamily: "'Lexend',sans-serif" }}>{navState.subject.name}</span>
                </button>
              )}

              {navState.workspace && (
                <div className="flex items-center gap-2 pl-12 pr-2 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <svg className="w-3.5 h-3.5 flex-shrink-0 relative z-10" style={{ color: "rgba(255,255,255,0.35)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span className="text-xs font-medium text-white truncate" style={{ fontFamily: "'Lexend',sans-serif" }}>{navState.workspace.title}</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Spacer ── */}
      <div className="flex-1" />

      {/* ── Bottom ── */}
      <div className="flex-shrink-0 px-3 pt-3 pb-4 space-y-1" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <button
          onClick={() => navDirect({ view: "settings" })}
          className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left transition-all"
          style={{
            color: navState.view === "settings" ? "white" : "rgba(255,255,255,0.4)",
            background: navState.view === "settings" ? "rgba(255,255,255,0.06)" : "transparent",
            fontFamily: "'Lexend',sans-serif",
          }}
          onMouseEnter={e => { if (navState.view !== "settings") e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
          onMouseLeave={e => { if (navState.view !== "settings") e.currentTarget.style.background = "transparent"; }}
        >
          {navState.view === "settings" && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full" style={{ background: "rgba(255,255,255,0.4)" }} />
          )}
          <span style={{ color: navState.view === "settings" ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)" }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </span>
          Settings
        </button>

        {/* User card */}
        <div className="px-3 py-2.5 rounded-xl flex items-center gap-3 mt-1"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-xs flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
            {initials}
          </div>
          <p className="text-xs font-semibold text-white flex-1 truncate" style={{ fontFamily: "'Lexend',sans-serif" }}>{displayName}</p>
          <button
            onClick={onSignOut}
            className="p-1 rounded-lg transition-all"
            style={{ color: "rgba(255,255,255,0.25)" }}
            title="Sign out"
            onMouseEnter={e => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.background = "rgba(248,113,113,0.1)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.25)"; e.currentTarget.style.background = "transparent"; }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
