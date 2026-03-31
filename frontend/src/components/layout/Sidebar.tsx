import { useEffect, useRef, useState } from "react";
import { getMe, getToken, type UserResponse } from "../../api/auth";
import { useNavStore } from "../../store/navStore";
import type { NavView } from "../../store/navStore";
export type { NavView, NavState } from "../../store/navStore";

const SPRING    = "cubic-bezier(0.25, 1.1, 0.4, 1)";
const RAIL_W    = 56;
const PANEL_W   = 240;
const BG        = "#070d18";
const DIVIDER   = "rgba(255,255,255,0.06)";
const DASHBOARD_HOME_SPLASH_EVENT = "studybuddy:dashboard-home-splash";

// ── nav data ──────────────────────────────────────────────────────────────────
const PLAN_STEPS = [
  { label: "Missions",   color: "#818cf8", view: "goals"      as NavView },
  { label: "Subjects",   color: "#a78bfa", view: "subjects"   as NavView },
  { label: "Workspaces", color: "#10B981", view: "workspaces" as NavView },
  { label: "Documents",  color: "#22d3ee", view: "documents"  as NavView },
  { label: "Summaries",  color: "#06b6d4", view: "summary"    as NavView },
  { label: "Road Map",   color: "#8b5cf6", view: "roadmap"    as NavView },
];
const STUDY_STEPS = [
  { label: "Sessions",   color: "#34d399", view: "sessions"   as NavView },
  { label: "Flashcards", color: "#f59e0b", view: "flashcards" as NavView },
  { label: "Quiz Sets",  color: "#f97316", view: "quizzes"    as NavView },
  { label: "Notes",      color: "#ec4899", view: "notes"      as NavView },
];

const PLAN_VIEWS  = new Set(["goals","goal","subjects","subject","workspaces","workspace","documents","summary","roadmap"]);
const STUDY_VIEWS = new Set(["sessions","flashcards","quizzes","notes"]);

type ActiveSection = "overview" | "plan" | "study" | "groups" | "settings";
function getSection(view: NavView): ActiveSection {
  if (view === "overview") return "overview";
  if (PLAN_VIEWS.has(view))  return "plan";
  if (STUDY_VIEWS.has(view)) return "study";
  if (view === "groups")     return "groups";
  return "settings";
}

// ── tiny inline icons ─────────────────────────────────────────────────────────
function IcoHome() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75"
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
    </svg>
  );
}
function IcoPlan() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
    </svg>
  );
}
function IcoStudy() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75"
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
    </svg>
  );
}
function IcoGroups() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75"
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
    </svg>
  );
}
function IcoSettings() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
    </svg>
  );
}
function IcoChevronLeft() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
    </svg>
  );
}
function IcoChevronRight() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
    </svg>
  );
}
function IcoSearch() {
  return (
    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "rgba(255,255,255,0.25)" }}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
    </svg>
  );
}
function IcoSignOut() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
    </svg>
  );
}

// ── NavStep row ───────────────────────────────────────────────────────────────
function NavRow({ s, isActive, onClick }: {
  s: { label: string; color: string; view: NavView };
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex items-center gap-2.5 w-full px-3 py-[7px] rounded-lg text-left transition-all"
      style={{
        color: isActive ? "white" : "rgba(255,255,255,0.5)",
        background: isActive ? `${s.color}14` : "transparent",
        transitionTimingFunction: SPRING,
        transitionDuration: "300ms",
        fontFamily: "'Lexend',sans-serif",
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
    >
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full" style={{ background: s.color }} />
      )}
      <span className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: s.color, opacity: isActive ? 1 : 0.6, boxShadow: isActive ? `0 0 6px ${s.color}` : "none" }} />
      <span className="text-[13px] font-medium truncate">{s.label}</span>
    </button>
  );
}

// ── RailButton ────────────────────────────────────────────────────────────────
function RailBtn({ isActive, onClick, title, children }: {
  isActive: boolean; onClick: () => void; title: string; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center justify-center w-10 h-10 rounded-xl transition-all"
      style={{
        color: isActive ? "#818cf8" : "rgba(255,255,255,0.3)",
        background: isActive ? "rgba(99,102,241,0.15)" : "transparent",
        transitionTimingFunction: SPRING,
        transitionDuration: "400ms",
      }}
      onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; } }}
      onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.3)"; } }}
    >
      {children}
    </button>
  );
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────
export default function Sidebar({ onSignOut }: { onSignOut: () => Promise<void> }) {
  const { navState, navDirect, toGoal, toSubject, sidebarOpen, setSidebarOpen } = useNavStore();
  const [panelOpen, setPanelOpen] = useState(false);
  const [search, setSearch]       = useState("");
  const [user, setUser]           = useState<UserResponse | null>(null);
  const sidebarRef                = useRef<HTMLElement>(null);

  const section    = getSection(navState.view);
  const isDeep     = ["goal", "subject", "workspace"].includes(navState.view);
  const goalColor  = navState.goal?.cover_color ?? "#6366f1";
  const isOverview = navState.view === "overview";

  // Keep --sb-w in sync
  useEffect(() => {
    document.documentElement.style.setProperty("--sb-w", `${panelOpen ? RAIL_W + PANEL_W : RAIL_W}px`);
  }, [panelOpen]);

  // Close panel when clicking outside — only allowed on the Overview page
  useEffect(() => {
    if (!panelOpen || !isOverview) return;
    function onMouseDown(e: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [panelOpen, isOverview]);

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

  const nav = (view: NavView) => { navDirect({ view }); setSidebarOpen(false); };
  const goHome = () => {
    window.dispatchEvent(new Event(DASHBOARD_HOME_SPLASH_EVENT));
    nav("overview");
  };

  const filterSteps = <T extends { label: string }>(steps: T[]) =>
    search.trim() ? steps.filter(s => s.label.toLowerCase().includes(search.toLowerCase())) : steps;

  const planSteps  = filterSteps(PLAN_STEPS);
  const studySteps = filterSteps(STUDY_STEPS);

  const RAIL_NAV = [
    { id: "overview" as ActiveSection, icon: <IcoHome />,   label: "Overview",      view: "overview"   as NavView },
    { id: "plan"     as ActiveSection, icon: <IcoPlan />,   label: "Plan",          view: "goals"      as NavView },
    { id: "study"    as ActiveSection, icon: <IcoStudy />,  label: "Study & Review",view: "sessions"   as NavView },
    { id: "groups"   as ActiveSection, icon: <IcoGroups />, label: "Study Groups",  view: "groups"     as NavView },
  ];

  return (
    <aside
      ref={sidebarRef}
      className={`fixed left-0 top-0 h-screen flex flex-row z-50 transition-transform duration-500 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}
      style={{ transitionTimingFunction: SPRING }}
    >
      {/* ── Left Icon Rail ── */}
      <div
        className="flex flex-col items-center gap-1 py-4 flex-shrink-0"
        style={{ width: RAIL_W, background: BG, borderRight: `1px solid ${DIVIDER}`, cursor: !panelOpen ? "pointer" : "default" }}
        onClick={() => { if (!panelOpen) setPanelOpen(true); }}
      >
        {/* Logo */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goHome();
          }}
          title="Home"
          className="flex items-center justify-center w-10 h-10 mb-1 rounded-xl transition-opacity hover:opacity-85"
        >
          <img src="/assets/Logomark_final3.svg" alt="StudyBuddy" className="w-7 h-7" />
        </button>

        {/* Panel toggle */}
        <button
          onClick={e => { e.stopPropagation(); setPanelOpen(p => !p); }}
          title={panelOpen ? "Collapse" : "Expand"}
          className="flex items-center justify-center w-7 h-7 rounded-lg mb-2 transition-all"
          style={{ color: "rgba(255,255,255,0.25)" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.25)"; }}
        >
          {panelOpen ? <IcoChevronLeft /> : <IcoChevronRight />}
        </button>

        <div className="w-8 h-px mb-2" style={{ background: DIVIDER }} />

        {/* Nav icons */}
        {RAIL_NAV.map(item => (
          <RailBtn key={item.id} isActive={section === item.id} onClick={() => nav(item.view)} title={item.label}>
            {item.icon}
          </RailBtn>
        ))}

        <div className="flex-1" />

        {/* Settings */}
        <RailBtn isActive={section === "settings"} onClick={() => nav("settings")} title="Settings">
          <IcoSettings />
        </RailBtn>

        {/* Avatar */}
        <button
          onClick={() => nav("settings")}
          title={displayName}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold mt-1 flex-shrink-0 transition-opacity hover:opacity-80"
          style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}
        >
          {initials}
        </button>
      </div>

      {/* ── Detail Panel ── */}
      <div
        className="flex flex-col h-screen overflow-hidden transition-all flex-shrink-0"
        style={{
          width: panelOpen ? PANEL_W : 0,
          transitionTimingFunction: SPRING,
          transitionDuration: "500ms",
          background: BG,
          borderRight: `1px solid ${DIVIDER}`,
        }}
      >
        {/* Inner — fixed width so content doesn't reflow */}
        <div
          className="flex flex-col h-full overflow-y-auto"
          style={{ width: PANEL_W, minWidth: PANEL_W }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
            <button
              type="button"
              onClick={goHome}
              title="Home"
              className="text-[16px] font-extrabold tracking-tight text-white transition-opacity hover:opacity-85"
              style={{ fontFamily: "'Lexend',sans-serif" }}
            >
              Study<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Buddy</span>
            </button>
            <button
              onClick={() => setPanelOpen(false)}
              title="Collapse"
              className="flex items-center justify-center w-7 h-7 rounded-lg transition-all"
              style={{ color: "rgba(255,255,255,0.25)" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.25)"; }}
            >
              <IcoChevronLeft />
            </button>
          </div>

          {/* Search */}
          <div className="px-3 pb-3 flex-shrink-0">
            <div
              className="flex items-center gap-2 px-3 h-9 rounded-lg"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${DIVIDER}` }}
            >
              <IcoSearch />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent border-none outline-none text-[13px] text-white placeholder:text-gray-600 w-full"
                style={{ fontFamily: "'Lexend',sans-serif" }}
              />
            </div>
          </div>

          {/* Overview link */}
          <div className="px-3 flex-shrink-0">
            <button
              onClick={() => nav("overview")}
              className="relative flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-left transition-all"
              style={{
                color: section === "overview" ? "white" : "rgba(255,255,255,0.45)",
                background: section === "overview" ? "rgba(99,102,241,0.12)" : "transparent",
                fontFamily: "'Lexend',sans-serif",
                transitionTimingFunction: SPRING,
                transitionDuration: "300ms",
              }}
              onMouseEnter={e => { if (section !== "overview") e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={e => { if (section !== "overview") e.currentTarget.style.background = "transparent"; }}
            >
              {section === "overview" && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full" style={{ background: "#818cf8" }} />
              )}
              <span style={{ color: section === "overview" ? "#818cf8" : "rgba(255,255,255,0.3)" }}><IcoHome /></span>
              <span className="text-[13px] font-medium">Overview</span>
            </button>
          </div>

          <div className="mx-3 my-2 h-px flex-shrink-0" style={{ background: DIVIDER }} />

          {/* Plan section */}
          <div className="px-3 flex-shrink-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider px-3 mb-1.5" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "'Lexend',sans-serif" }}>
              Plan
            </p>
            <div className="relative">
              <div className="absolute w-px" style={{ left: 14, top: 10, bottom: 10, background: "rgba(255,255,255,0.06)" }} />
              {planSteps.map(s => (
                <NavRow key={s.view} s={s} isActive={navState.view === s.view || (isDeep && s.view === "goals" && section === "plan" && navState.view !== "goals"
                  ? false : navState.view === s.view)} onClick={() => nav(s.view)} />
              ))}
              {planSteps.length === 0 && (
                <p className="text-[12px] px-3 py-2" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "'Lexend',sans-serif" }}>No results</p>
              )}
            </div>
          </div>

          <div className="mx-3 my-2 h-px flex-shrink-0" style={{ background: "rgba(255,255,255,0.04)" }} />

          {/* Study & Review section */}
          <div className="px-3 flex-shrink-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider px-3 mb-1.5" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "'Lexend',sans-serif" }}>
              Study &amp; Review
            </p>
            <div className="relative">
              <div className="absolute w-px" style={{ left: 14, top: 10, bottom: 10, background: "rgba(255,255,255,0.06)" }} />
              {studySteps.map(s => (
                <NavRow key={s.view} s={s} isActive={navState.view === s.view} onClick={() => nav(s.view)} />
              ))}
              {studySteps.length === 0 && (
                <p className="text-[12px] px-3 py-2" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "'Lexend',sans-serif" }}>No results</p>
              )}
            </div>
          </div>

          {/* Groups link */}
          {!search && (
            <>
              <div className="mx-3 my-2 h-px flex-shrink-0" style={{ background: DIVIDER }} />
              <div className="px-3 flex-shrink-0">
                <button
                  onClick={() => nav("groups")}
                  className="relative flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-left transition-all"
                  style={{
                    color: section === "groups" ? "white" : "rgba(255,255,255,0.45)",
                    background: section === "groups" ? "rgba(99,102,241,0.12)" : "transparent",
                    fontFamily: "'Lexend',sans-serif",
                    transitionTimingFunction: SPRING,
                    transitionDuration: "300ms",
                  }}
                  onMouseEnter={e => { if (section !== "groups") e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={e => { if (section !== "groups") e.currentTarget.style.background = "transparent"; }}
                >
                  {section === "groups" && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full" style={{ background: "#818cf8" }} />
                  )}
                  <span style={{ color: section === "groups" ? "#818cf8" : "rgba(255,255,255,0.3)" }}><IcoGroups /></span>
                  <span className="text-[13px] font-medium">Study Groups</span>
                </button>
              </div>
            </>
          )}

          {/* Current Path (deep nav) */}
          {isDeep && navState.goal && !search && (
            <>
              <div className="mx-3 my-2 h-px flex-shrink-0" style={{ background: DIVIDER }} />
              <div className="px-3 flex-shrink-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider px-3 mb-1.5" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "'Lexend',sans-serif" }}>
                  Current Path
                </p>
                <div className="relative">
                  <div className="absolute left-3 top-5 w-px" style={{
                    bottom: navState.workspace ? "2.5rem" : navState.subject ? "1.75rem" : "0",
                    background: `${goalColor}28`,
                  }} />
                  <button
                    onClick={() => toGoal(navState.goal!)}
                    className="flex items-center gap-2.5 w-full px-2 py-2 rounded-xl text-left transition-all"
                    style={{
                      color: navState.view === "goal" ? "white" : "rgba(255,255,255,0.5)",
                      background: navState.view === "goal" ? `${goalColor}18` : "transparent",
                    }}
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
                      style={{
                        color: navState.view === "subject" ? "white" : "rgba(255,255,255,0.4)",
                        background: navState.view === "subject" ? "rgba(255,255,255,0.06)" : "transparent",
                      }}
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

          <div className="flex-1" />

          {/* User card */}
          <div className="px-3 pt-3 pb-4 flex-shrink-0" style={{ borderTop: `1px solid ${DIVIDER}` }}>
            <div
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${DIVIDER}` }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}
              >
                {initials}
              </div>
              <p className="text-[13px] font-semibold text-white flex-1 truncate" style={{ fontFamily: "'Lexend',sans-serif" }}>
                {displayName}
              </p>
              <button
                onClick={onSignOut}
                className="p-1 rounded-lg transition-all"
                style={{ color: "rgba(255,255,255,0.25)" }}
                title="Sign out"
                onMouseEnter={e => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.background = "rgba(248,113,113,0.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.25)"; e.currentTarget.style.background = "transparent"; }}
              >
                <IcoSignOut />
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
