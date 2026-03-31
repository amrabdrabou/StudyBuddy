import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getMe, getToken, type UserResponse } from "../../api/auth";
import { useNavStore, type NavView } from "../../store/navStore";

// ── Design tokens (match Sidebar + OverviewSection palette) ───────────────────

const C = {
  bg:        "#070d18",
  border:    "rgba(255,255,255,0.06)",
  text:      "rgba(255,255,255,0.85)",
  muted:     "rgba(255,255,255,0.35)",
  hover:     "rgba(255,255,255,0.06)",
  indigo:    "#818cf8",
  violet:    "#a78bfa",
  emerald:   "#34d399",
  cyan:      "#22d3ee",
  amber:     "#f59e0b",
  orange:    "#f97316",
  pink:      "#ec4899",
  green:     "#10B981",
} as const;

// ── Per-view metadata ─────────────────────────────────────────────────────────

const VIEW_META: Record<NavView, { label: string; color: string; icon: string }> = {
  overview:   { label: "Dashboard",    color: C.indigo,  icon: "⊞" },
  goals:      { label: "Missions",     color: C.indigo,  icon: "◎" },
  goal:       { label: "Mission",      color: C.indigo,  icon: "◎" },
  subject:    { label: "Subject",      color: C.violet,  icon: "◈" },
  workspace:  { label: "Workspace",    color: C.green,   icon: "▣" },
  subjects:   { label: "Subjects",     color: C.violet,  icon: "◈" },
  workspaces: { label: "Workspaces",   color: C.green,   icon: "▣" },
  documents:  { label: "Documents",    color: C.cyan,    icon: "◻" },
  summary:    { label: "Summaries",    color: C.cyan,    icon: "◈" },
  roadmap:    { label: "Roadmap",      color: C.violet,  icon: "◎" },
  sessions:   { label: "Sessions",     color: C.emerald, icon: "▶" },
  flashcards: { label: "Flashcards",   color: C.amber,   icon: "◁" },
  quizzes:    { label: "Quiz Sets",    color: C.orange,  icon: "◇" },
  notes:      { label: "Notes",        color: C.pink,    icon: "◌" },
  groups:     { label: "Study Groups", color: C.indigo,  icon: "◉" },
  settings:   { label: "Settings",     color: C.muted,   icon: "◌" },
};

// ── Command palette items ─────────────────────────────────────────────────────

type CmdItem = {
  id: string;
  label: string;
  sub?: string;
  color: string;
  category: "Navigate" | "Quick Action";
  view: NavView;
};

const COMMANDS: CmdItem[] = [
  { id: "nav-overview",   label: "Dashboard",       sub: "Overview & stats",           color: C.indigo,  category: "Navigate",     view: "overview"   },
  { id: "nav-goals",      label: "Missions",         sub: "Your learning goals",        color: C.indigo,  category: "Navigate",     view: "goals"      },
  { id: "nav-subjects",   label: "Subjects",         sub: "Topics to master",           color: C.violet,  category: "Navigate",     view: "subjects"   },
  { id: "nav-workspaces", label: "Workspaces",       sub: "Study environments",         color: C.green,   category: "Navigate",     view: "workspaces" },
  { id: "nav-documents",  label: "Documents",        sub: "Uploaded study materials",   color: C.cyan,    category: "Navigate",     view: "documents"  },
  { id: "nav-sessions",   label: "Sessions",         sub: "Timed focus blocks",         color: C.emerald, category: "Navigate",     view: "sessions"   },
  { id: "nav-flashcards", label: "Flashcards",       sub: "AI review decks",            color: C.amber,   category: "Navigate",     view: "flashcards" },
  { id: "nav-quizzes",    label: "Quiz Sets",        sub: "Knowledge tests",            color: C.orange,  category: "Navigate",     view: "quizzes"    },
  { id: "nav-notes",      label: "Notes",            sub: "Captured insights",          color: C.pink,    category: "Navigate",     view: "notes"      },
  { id: "nav-settings",   label: "Settings",         sub: "Account & preferences",      color: C.muted,   category: "Navigate",     view: "settings"   },
  { id: "qa-mission",     label: "New Mission",      sub: "Create a learning goal",     color: C.indigo,  category: "Quick Action", view: "goals"      },
  { id: "qa-session",     label: "Start Session",    sub: "Begin a timed focus block",  color: C.emerald, category: "Quick Action", view: "sessions"   },
  { id: "qa-note",        label: "Capture a Note",   sub: "Write an insight",           color: C.pink,    category: "Quick Action", view: "notes"      },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  onSignOut: () => Promise<void>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TopBar({ onSignOut }: Props) {
  const { navState, navDirect, toGoal, toSubject, toWorkspace, setWorkspaceTab, recentWorkspaces } = useNavStore();

  const [user, setUser]               = useState<UserResponse | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery]             = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [menuOpen, setMenuOpen]       = useState(false);
  const [signing, setSigning]         = useState(false);

  const searchRef  = useRef<HTMLInputElement>(null);
  const menuRef    = useRef<HTMLDivElement>(null);
  const listRef    = useRef<HTMLDivElement>(null);

  // ── Load user profile ──────────────────────────────────────────────────────

  useEffect(() => {
    const token = getToken();
    if (token) getMe(token).then(setUser).catch(() => {});
  }, []);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen(v => !v);
      }
      if (e.key === "Escape") {
        setPaletteOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Auto-focus search when palette opens ───────────────────────────────────

  useEffect(() => {
    if (paletteOpen) {
      setQuery("");
      setSelectedIdx(0);
      // Wait one frame for the DOM to mount
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [paletteOpen]);

  // ── Close user menu on outside click ──────────────────────────────────────

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Filtered commands ──────────────────────────────────────────────────────

  const filtered = useMemo<CmdItem[]>(() => {
    const q = query.toLowerCase().trim();
    if (!q) return COMMANDS;
    return COMMANDS.filter(
      c =>
        c.label.toLowerCase().includes(q) ||
        (c.sub ?? "").toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q),
    );
  }, [query]);

  // Keep selectedIdx in range when filtered list shrinks
  useEffect(() => {
    setSelectedIdx(i => Math.min(i, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  // ── Command palette keyboard navigation ────────────────────────────────────

  const handlePaletteKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx(i => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx(i => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && filtered[selectedIdx]) {
        runCommand(filtered[selectedIdx]);
      }
    },
    [filtered, selectedIdx],
  );

  // ── Execute a command ──────────────────────────────────────────────────────

  const runCommand = useCallback(
    (cmd: CmdItem) => {
      navDirect({ view: cmd.view });
      setPaletteOpen(false);
    },
    [navDirect],
  );

  // ── Breadcrumb segments ────────────────────────────────────────────────────

  const breadcrumb = useMemo(() => {
    const { view, goal, subject, workspace } = navState;
    const meta = VIEW_META[view];

    if (view === "goal" && goal) {
      return [
        { label: "Missions", color: C.indigo, onClick: () => navDirect({ view: "goals" }) },
        { label: goal.title, color: meta.color, onClick: undefined },
      ];
    }
    if (view === "subject" && goal && subject) {
      return [
        { label: "Missions", color: C.indigo, onClick: () => navDirect({ view: "goals" }) },
        { label: goal.title, color: C.indigo, onClick: () => toGoal(goal) },
        { label: subject.name, color: C.violet, onClick: undefined },
      ];
    }
    if (view === "workspace" && goal && subject && workspace) {
      return [
        { label: "Missions", color: C.indigo, onClick: () => navDirect({ view: "goals" }) },
        { label: goal.title, color: C.indigo, onClick: () => toGoal(goal) },
        { label: subject.name, color: C.violet, onClick: () => toSubject(goal, subject) },
        { label: workspace.title, color: C.green, onClick: undefined },
      ];
    }
    return [{ label: meta.label, color: meta.color, onClick: undefined }];
  }, [navState, navDirect, toGoal, toSubject]);

  // ── User initials ──────────────────────────────────────────────────────────

  const initials = user
    ? (user.first_name?.[0] ?? user.username?.[0] ?? user.email[0]).toUpperCase()
    : "?";

  const displayName = user
    ? user.first_name
      ? `${user.first_name}${user.last_name ? " " + user.last_name : ""}`
      : (user.username ?? user.email)
    : "Loading…";

  // ── Grouped commands for palette UI ───────────────────────────────────────

  const continueWorkspace = recentWorkspaces[0];

  const grouped = useMemo(() => {
    const nav = filtered.filter(c => c.category === "Navigate");
    const qa  = filtered.filter(c => c.category === "Quick Action");
    return { nav, qa };
  }, [filtered]);

  // Global flat index to absolute index helper
  const flatIdx = (category: "nav" | "qa", i: number) =>
    category === "nav" ? i : grouped.nav.length + i;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Desktop header bar ────────────────────────────────────────────── */}
      <header
        className="hidden md:flex items-center gap-4 px-6 h-14 sticky top-0 z-30 flex-shrink-0"
        style={{
          background: "rgba(7,13,24,0.88)",
          backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${C.border}`,
          fontFamily: "'Lexend', sans-serif",
        }}
      >

        {/* ── LEFT: breadcrumb ──────────────────────────────────────────── */}
        <nav className="flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden">
          {breadcrumb.map((seg, i) => (
            <span key={i} className="flex items-center gap-1.5 min-w-0">
              {i > 0 && (
                <svg className="w-3 h-3 flex-shrink-0" style={{ color: "rgba(255,255,255,0.15)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                </svg>
              )}
              {seg.onClick ? (
                <button
                  onClick={seg.onClick}
                  className="text-sm font-medium truncate transition-colors"
                  style={{ color: "rgba(255,255,255,0.35)", maxWidth: 120 }}
                  onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
                >
                  {seg.label}
                </button>
              ) : (
                <span
                  className="text-sm font-semibold truncate"
                  style={{ color: i === 0 ? C.text : seg.color, maxWidth: 200 }}
                >
                  {seg.label}
                </span>
              )}
            </span>
          ))}
        </nav>

        {/* ── CENTER: search trigger ─────────────────────────────────────── */}
        <button
          onClick={() => setPaletteOpen(true)}
          className="flex items-center gap-2.5 px-3.5 h-9 rounded-xl transition-all flex-shrink-0"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            minWidth: 220,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
        >
          <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: C.muted }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-xs flex-1 text-left" style={{ color: C.muted }}>Search or jump to…</span>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0"
            style={{ color: "rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)", letterSpacing: "0.04em" }}
          >
            {navigator.platform.toLowerCase().includes("mac") ? "⌘K" : "Ctrl K"}
          </span>
        </button>

        {/* ── RIGHT: actions + user ──────────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-shrink-0">

          {/* Quick create */}
          <button
            onClick={() => navDirect({ view: "goals" })}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-xs font-bold transition-all"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", color: "#fff", boxShadow: "0 2px 12px rgba(79,70,229,0.3)" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            title="New Mission"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            New
          </button>

          {continueWorkspace && (
            <button
              onClick={() => {
                toWorkspace(continueWorkspace.goal, continueWorkspace.subject, continueWorkspace.workspace);
                if (continueWorkspace.tab) setWorkspaceTab(continueWorkspace.tab);
              }}
              className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-xs font-bold transition-all"
              style={{ background: "rgba(52,211,153,0.12)", color: C.emerald, border: "1px solid rgba(52,211,153,0.22)" }}
              title={`Continue ${continueWorkspace.workspace.title}`}
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Continue
            </button>
          )}

          {/* User avatar + dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="flex items-center gap-2.5 pl-1 pr-2.5 h-9 rounded-xl transition-all"
              style={{ background: menuOpen ? "rgba(255,255,255,0.07)" : "transparent" }}
              onMouseEnter={e => { if (!menuOpen) e.currentTarget.style.background = C.hover; }}
              onMouseLeave={e => { if (!menuOpen) e.currentTarget.style.background = "transparent"; }}
            >
              {/* Avatar circle */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}
              >
                {initials}
              </div>
              {/* Name */}
              <span className="text-xs font-semibold max-w-[96px] truncate hidden lg:block" style={{ color: C.text }}>
                {displayName}
              </span>
              {/* Chevron */}
              <svg
                className="w-3 h-3 flex-shrink-0 transition-transform hidden lg:block"
                style={{ color: C.muted, transform: menuOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* ── User dropdown menu ──────────────────────────────────────── */}
            {menuOpen && (
              <div
                className="absolute right-0 top-[calc(100%+8px)] w-64 rounded-2xl overflow-hidden z-50"
                style={{
                  background: "#0e1729",
                  border: `1px solid ${C.border}`,
                  boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
                }}
              >
                {/* User info card */}
                <div className="px-4 pt-4 pb-3 flex items-center gap-3" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                    <p className="text-[11px] truncate" style={{ color: C.muted }}>{user?.email ?? "—"}</p>
                  </div>
                </div>

                {/* Menu items */}
                <div className="p-2">
                  <button
                    onClick={() => { navDirect({ view: "settings" }); setMenuOpen(false); }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left"
                    style={{ color: C.text }}
                    onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <svg className="w-4 h-4 flex-shrink-0" style={{ color: C.muted }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </button>

                  <div className="my-1.5" style={{ height: 1, background: C.border }} />

                  <button
                    disabled={signing}
                    onClick={async () => {
                      setSigning(true);
                      setMenuOpen(false);
                      await onSignOut().catch(() => {});
                      setSigning(false);
                    }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left"
                    style={{ color: "#f87171" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(248,113,113,0.08)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    {signing ? "Signing out…" : "Sign out"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Command palette ────────────────────────────────────────────────── */}
      {paletteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}
          onClick={e => { if (e.target === e.currentTarget) setPaletteOpen(false); }}
        >
          <div
            className="w-full max-w-xl rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: "#0e1729",
              border: `1px solid rgba(255,255,255,0.1)`,
              boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
              fontFamily: "'Lexend', sans-serif",
              maxHeight: "60vh",
            }}
          >
            {/* Search input */}
            <div
              className="flex items-center gap-3 px-4 py-3.5"
              style={{ borderBottom: `1px solid ${C.border}` }}
            >
              <svg className="w-4 h-4 flex-shrink-0" style={{ color: C.muted }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handlePaletteKey}
                placeholder="Search or jump to…"
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: C.text }}
              />
              <kbd
                className="text-[10px] px-1.5 py-0.5 rounded-md flex-shrink-0"
                style={{ color: C.muted, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}` }}
              >
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div ref={listRef} className="overflow-y-auto flex-1 p-2">
              {filtered.length === 0 && (
                <p className="text-center py-8 text-sm" style={{ color: C.muted }}>
                  No results for "{query}"
                </p>
              )}

              {/* Navigate group */}
              {grouped.nav.length > 0 && (
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest px-3 pt-2 pb-1.5" style={{ color: "rgba(255,255,255,0.2)" }}>
                    Navigate
                  </p>
                  {grouped.nav.map((cmd, i) => {
                    const idx = flatIdx("nav", i);
                    const active = selectedIdx === idx;
                    return (
                      <button
                        key={cmd.id}
                        onMouseEnter={() => setSelectedIdx(idx)}
                        onClick={() => runCommand(cmd)}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-all"
                        style={{
                          background: active ? "rgba(99,102,241,0.12)" : "transparent",
                        }}
                      >
                        <span
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: `${cmd.color}18`, color: cmd.color }}
                        >
                          {VIEW_META[cmd.view]?.icon ?? "·"}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="text-sm font-semibold block text-white">{cmd.label}</span>
                          {cmd.sub && (
                            <span className="text-[11px] block truncate" style={{ color: C.muted }}>{cmd.sub}</span>
                          )}
                        </span>
                        {active && (
                          <kbd className="text-[10px] px-1.5 py-0.5 rounded-md flex-shrink-0" style={{ color: C.muted, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}` }}>
                            ↵
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Quick Actions group */}
              {grouped.qa.length > 0 && (
                <div className={grouped.nav.length > 0 ? "mt-1" : ""}>
                  <p className="text-[9px] font-black uppercase tracking-widest px-3 pt-2 pb-1.5" style={{ color: "rgba(255,255,255,0.2)" }}>
                    Quick Action
                  </p>
                  {grouped.qa.map((cmd, i) => {
                    const idx = flatIdx("qa", i);
                    const active = selectedIdx === idx;
                    return (
                      <button
                        key={cmd.id}
                        onMouseEnter={() => setSelectedIdx(idx)}
                        onClick={() => runCommand(cmd)}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-all"
                        style={{
                          background: active ? "rgba(99,102,241,0.12)" : "transparent",
                        }}
                      >
                        <span
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs flex-shrink-0"
                          style={{ background: `${cmd.color}18`, color: cmd.color }}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                          </svg>
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="text-sm font-semibold block text-white">{cmd.label}</span>
                          {cmd.sub && (
                            <span className="text-[11px] block truncate" style={{ color: C.muted }}>{cmd.sub}</span>
                          )}
                        </span>
                        {active && (
                          <kbd className="text-[10px] px-1.5 py-0.5 rounded-md flex-shrink-0" style={{ color: C.muted, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}` }}>
                            ↵
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div
              className="flex items-center gap-4 px-4 py-2.5 flex-shrink-0"
              style={{ borderTop: `1px solid ${C.border}` }}
            >
              {[
                { keys: ["↑", "↓"], label: "navigate" },
                { keys: ["↵"], label: "open" },
                { keys: ["ESC"], label: "close" },
              ].map(({ keys, label }) => (
                <span key={label} className="flex items-center gap-1">
                  {keys.map(k => (
                    <kbd key={k} className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ color: C.muted, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}` }}>
                      {k}
                    </kbd>
                  ))}
                  <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>{label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
