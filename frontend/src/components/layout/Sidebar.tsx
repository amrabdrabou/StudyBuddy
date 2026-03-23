import type { BigGoal } from "../../api/big_goals";
import type { Subject } from "../../api/subjects";
import type { Workspace } from "../../api/workspaces";

export type NavView = "overview" | "goals" | "goal" | "subject" | "workspace" | "groups" | "settings";

export interface NavState {
  view: NavView;
  goal?: BigGoal;
  subject?: Subject;
  workspace?: Workspace;
}

export interface NavActions {
  toOverview: () => void;
  toGoals: () => void;
  toGoal: (g: BigGoal) => void;
  toSubject: (g: BigGoal, s: Subject) => void;
  toWorkspace: (g: BigGoal, s: Subject, w: Workspace) => void;
  toGroups: () => void;
  toSettings: () => void;
  onGoalUpdate: (g: BigGoal) => void;
  goBack: () => void;
}

const ROOT_NAV = [
  {
    id: "overview" as NavView, label: "Overview",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>,
  },
  {
    id: "goals" as NavView, label: "Missions",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>,
  },
  {
    id: "groups" as NavView, label: "Study Groups",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>,
  },
];

export default function Sidebar({
  navState,
  nav,
  onSignOut,
}: {
  navState: NavState;
  nav: NavActions;
  onSignOut: () => void;
}) {
  const isDeep = ["goal","subject","workspace"].includes(navState.view);
  const goalColor = navState.goal?.cover_color ?? "#6366f1";

  function handleRootNav(id: NavView) {
    if (id === "overview") nav.toOverview();
    else if (id === "goals") nav.toGoals();
    else if (id === "groups") nav.toGroups();
  }

  const rootActive = isDeep ? "goals" : navState.view;

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 flex flex-col z-50 bg-slate-950"
      style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}>

      {/* Logo */}
      <div className="px-5 pt-6 pb-5 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <img src="/assets/Logomark_final3.svg" alt="StudyBuddy" className="w-7 h-7" />
          <h1 className="text-xl font-extrabold tracking-tighter text-white" style={{ fontFamily: "'Lexend',sans-serif" }}>
            Study<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Buddy</span>
          </h1>
        </div>
      </div>

      {/* Root nav */}
      <nav className="px-3 flex flex-col gap-0.5 flex-shrink-0">
        {ROOT_NAV.map(item => {
          const isActive = rootActive === item.id;
          return (
            <button key={item.id} onClick={() => handleRootNav(item.id)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all w-full text-left"
              style={{
                color: isActive ? "#818cf8" : "rgba(255,255,255,0.45)",
                background: isActive ? "rgba(99,102,241,0.1)" : "transparent",
                fontFamily: "'Lexend',sans-serif",
              }}>
              <span style={{ color: isActive ? "#818cf8" : "rgba(255,255,255,0.3)" }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Breadcrumb trail — shown when drilling into goal/subject/workspace */}
      {isDeep && navState.goal && (
        <>
          <div className="mx-4 my-4 h-px bg-white/[0.06]" />
          <div className="px-3 flex flex-col gap-1 flex-shrink-0">
            <p className="text-[9px] text-gray-600 uppercase tracking-widest px-2 mb-1">Current Path</p>

            {/* Goal level */}
            <button
              onClick={() => nav.toGoal(navState.goal!)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-left transition-all w-full truncate"
              style={{
                color: navState.view === "goal" ? "white" : "rgba(255,255,255,0.5)",
                background: navState.view === "goal" ? `${goalColor}20` : "transparent",
              }}>
              <span className="text-base flex-shrink-0">{navState.goal.icon ?? "🎯"}</span>
              <span className="truncate">{navState.goal.title}</span>
            </button>

            {/* Subject level */}
            {navState.subject && (
              <button
                onClick={() => nav.toSubject(navState.goal!, navState.subject!)}
                className="flex items-center gap-2.5 pl-7 pr-3 py-2 rounded-xl text-sm font-medium text-left transition-all w-full truncate"
                style={{
                  color: navState.view === "subject" ? "white" : "rgba(255,255,255,0.4)",
                  background: navState.view === "subject" ? "rgba(255,255,255,0.05)" : "transparent",
                }}>
                <span className="text-base flex-shrink-0">{navState.subject.icon ?? "📚"}</span>
                <span className="truncate">{navState.subject.name}</span>
              </button>
            )}

            {/* Workspace level */}
            {navState.workspace && (
              <div
                className="flex items-center gap-2.5 pl-14 pr-3 py-2 rounded-xl text-sm font-medium text-white truncate"
                style={{ background: "rgba(255,255,255,0.05)" }}>
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                </svg>
                <span className="truncate">{navState.workspace.title}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom */}
      <div className="flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <button onClick={nav.toSettings}
          className="flex items-center gap-3 px-6 py-3 text-sm font-medium w-full text-left transition-colors"
          style={{ color: navState.view === "settings" ? "white" : "rgba(255,255,255,0.4)", fontFamily: "'Lexend',sans-serif" }}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          Settings
        </button>
        <div className="px-4 py-3 flex items-center gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>S</div>
          <p className="text-sm font-semibold text-white flex-1 truncate" style={{ fontFamily: "'Lexend',sans-serif" }}>Scholar</p>
          <button onClick={onSignOut} className="text-gray-600 hover:text-red-400 transition-colors" title="Sign out">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
