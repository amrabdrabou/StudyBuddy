import { create } from "zustand";
import type { BigGoal } from "../api/big_goals";
import type { Subject } from "../api/subjects";
import type { Workspace } from "../api/workspaces";
import { matchGoalPath, matchSubjectPath, matchWorkspacePath } from "./navPaths";

// ── Types (re-exported so Sidebar and pages can import from one place) ─────────

export type NavView =
  | "overview"
  | "goals"
  | "goal"
  | "subject"
  | "workspace"
  | "subjects"
  | "workspaces"
  | "documents"
  | "summary"
  | "roadmap"
  | "sessions"
  | "flashcards"
  | "quizzes"
  | "notes"
  | "groups"
  | "settings";

export interface NavState {
  view: NavView;
  goal?: BigGoal;
  subject?: Subject;
  workspace?: Workspace;
  tab?: string; // active workspace tab (documents | summary | ai-chat | …)
}

export interface RecentGoalEntry {
  goal: BigGoal;
  viewed_at: string;
}

export interface RecentWorkspaceEntry {
  goal: BigGoal;
  subject: Subject;
  workspace: Workspace;
  tab?: string;
  viewed_at: string;
}

interface RecentNavSnapshot {
  goals: RecentGoalEntry[];
  workspaces: RecentWorkspaceEntry[];
}

// v2 key — bumped to drop old shared (non-per-user) data automatically
const RECENT_NAV_KEY_PREFIX = "studybuddy.recent-nav.v2";

function recentKey(userId?: string | null) {
  return userId ? `${RECENT_NAV_KEY_PREFIX}.${userId}` : RECENT_NAV_KEY_PREFIX;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function navStateToPath(s: NavState): string {
  switch (s.view) {
    case "overview":    return "/dashboard";
    case "goals":       return "/goals";
    case "goal":        return s.goal ? `/goals/${s.goal.id}` : "/goals";
    case "subject":     return s.goal && s.subject
      ? `/goals/${s.goal.id}/subjects/${s.subject.id}` : "/goals";
    case "workspace": {
      if (!s.goal || !s.subject || !s.workspace) return "/workspaces";
      const base = `/goals/${s.goal.id}/subjects/${s.subject.id}/workspaces/${s.workspace.id}`;
      return s.tab ? `${base}/${s.tab}` : base;
    }
    case "subjects":    return "/subjects";
    case "workspaces":  return "/workspaces";
    case "documents":   return "/documents";
    case "summary":     return "/summary";
    case "roadmap":     return "/roadmap";
    case "sessions":    return "/sessions";
    case "flashcards":  return "/flashcards";
    case "quizzes":     return "/quizzes";
    case "notes":       return "/notes";
    case "groups":      return "/groups";
    case "settings":    return "/settings";
    default:            return "/goals";
  }
}

function pathToNavState(path: string): NavState {
  if (path === "/dashboard")  return { view: "overview" };
  if (path === "/goals")      return { view: "goals" };
  const workspaceMatch = matchWorkspacePath(path);
  if (workspaceMatch) {
    return { view: "workspace", tab: workspaceMatch.tab };
  }
  const subjectMatch = matchSubjectPath(path);
  if (subjectMatch) {
    return { view: "subject" };
  }
  const goalMatch = matchGoalPath(path);
  if (goalMatch) {
    return { view: "goal" };
  }
  if (path === "/subjects")   return { view: "subjects" };
  if (path === "/workspaces") return { view: "workspaces" };
  if (path === "/documents")  return { view: "documents" };
  if (path === "/summary")    return { view: "summary" };
  if (path === "/roadmap")    return { view: "roadmap" };
  if (path === "/sessions")   return { view: "sessions" };
  if (path === "/flashcards") return { view: "flashcards" };
  if (path === "/quizzes")    return { view: "quizzes" };
  if (path === "/notes")      return { view: "notes" };
  if (path === "/groups")     return { view: "groups" };
  if (path === "/settings")   return { view: "settings" };
  return { view: "goals" };
}

function resolveInitialNavState(): NavState {
  const s = window.history.state;
  if (s?.view) return s as NavState;
  return pathToNavState(window.location.pathname);
}

function readRecentNav(userId?: string | null): RecentNavSnapshot {
  try {
    const raw = window.localStorage.getItem(recentKey(userId));
    if (!raw) return { goals: [], workspaces: [] };
    const parsed = JSON.parse(raw) as Partial<RecentNavSnapshot>;
    return {
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
      workspaces: Array.isArray(parsed.workspaces) ? parsed.workspaces : [],
    };
  } catch {
    return { goals: [], workspaces: [] };
  }
}

function writeRecentNav(snapshot: RecentNavSnapshot, userId?: string | null) {
  try {
    window.localStorage.setItem(recentKey(userId), JSON.stringify(snapshot));
  } catch {
    // ignore localStorage failures
  }
}

function upsertRecentGoal(goals: RecentGoalEntry[], goal?: BigGoal): RecentGoalEntry[] {
  if (!goal) return goals;
  const next = [{ goal, viewed_at: new Date().toISOString() }, ...goals.filter(entry => entry.goal.id !== goal.id)];
  return next.slice(0, 5);
}

function upsertRecentWorkspace(workspaces: RecentWorkspaceEntry[], state: NavState): RecentWorkspaceEntry[] {
  if (state.view !== "workspace" || !state.goal || !state.subject || !state.workspace) return workspaces;
  const nextEntry: RecentWorkspaceEntry = {
    goal: state.goal,
    subject: state.subject,
    workspace: state.workspace,
    tab: state.tab,
    viewed_at: new Date().toISOString(),
  };
  const next = [nextEntry, ...workspaces.filter(entry => entry.workspace.id !== state.workspace!.id)];
  return next.slice(0, 5);
}

function buildRecentSnapshot(
  goals: RecentGoalEntry[],
  workspaces: RecentWorkspaceEntry[],
  state: NavState,
): RecentNavSnapshot {
  return {
    goals: upsertRecentGoal(goals, state.goal),
    workspaces: upsertRecentWorkspace(workspaces, state),
  };
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface NavStore {
  navState: NavState;
  history: NavState[];
  sidebarOpen: boolean;
  recentGoals: RecentGoalEntry[];
  recentWorkspaces: RecentWorkspaceEntry[];
  userId: string | null;

  // Core navigation
  navigate: (next: NavState) => void;
  /** Direct navigation — clears breadcrumb history (used by Sidebar top-level links). */
  navDirect: (next: NavState) => void;
  goBack: () => void;
  syncFromPopState: (state: NavState | null) => void;

  // UI
  setSidebarOpen: (open: boolean) => void;

  // User-scoped recent history
  initForUser: (userId: string) => void;
  clearRecentNav: () => void;
  removeStaleEntries: (validGoalIds: Set<string>, validWorkspaceIds: Set<string>) => void;

  // State sync
  onGoalUpdate: (updated: BigGoal) => void;
  onWorkspaceUpdate: (updated: Workspace) => void;

  // Convenience actions (use navigate — push to history)
  toOverview:    () => void;
  toGoals:       () => void;
  toGoal:        (goal: BigGoal) => void;
  toSubject:     (goal: BigGoal, subject: Subject) => void;
  toWorkspace:   (goal: BigGoal, subject: Subject, workspace: Workspace) => void;
  toSubjectsView:   () => void;
  toWorkspacesView: () => void;
  toDocumentsView:  () => void;
  toSummaryView:    () => void;
  toRoadmapView:    () => void;
  toSessionsView:   () => void;
  toFlashcardsView: () => void;
  toQuizzesView:    () => void;
  toNotesView:      () => void;
  toGroups:         () => void;
  toSettings:       () => void;
  /** Switch workspace tab — updates URL via replaceState (no back-button entry). */
  setWorkspaceTab:  (tab: string) => void;
}

export const useNavStore = create<NavStore>((set, get) => {
  // On first load userId is unknown — start with empty recent; initForUser loads the real data
  const initialRecent: RecentNavSnapshot = { goals: [], workspaces: [] };

  function navigate(next: NavState) {
    set(state => {
      const recent = buildRecentSnapshot(state.recentGoals, state.recentWorkspaces, next);
      writeRecentNav(recent, state.userId);
      return {
        history: [...state.history, state.navState],
        navState: next,
        recentGoals: recent.goals,
        recentWorkspaces: recent.workspaces,
      };
    });
    window.history.pushState(next, "", navStateToPath(next));
  }

  function navDirect(next: NavState) {
    set(state => {
      const recent = buildRecentSnapshot(state.recentGoals, state.recentWorkspaces, next);
      writeRecentNav(recent, state.userId);
      return {
        history: [],
        navState: next,
        recentGoals: recent.goals,
        recentWorkspaces: recent.workspaces,
      };
    });
    window.history.pushState(next, "", navStateToPath(next));
  }

  return {
    navState: resolveInitialNavState(),
    history: [],
    sidebarOpen: false,
    recentGoals: initialRecent.goals,
    recentWorkspaces: initialRecent.workspaces,
    userId: null,

    navigate,
    navDirect,

    goBack: () => {
      set(state => {
        if (state.history.length === 0) return state;
        const previous = state.history[state.history.length - 1];
        window.history.pushState(previous, "", navStateToPath(previous));
        return { navState: previous, history: state.history.slice(0, -1) };
      });
    },

    syncFromPopState: (state) => {
      if (state?.view) {
        set({ navState: state as NavState, history: [] });
      } else {
        // Fall back to deriving nav state from the current URL
        set({ navState: pathToNavState(window.location.pathname), history: [] });
      }
    },

    setSidebarOpen: (open) => set({ sidebarOpen: open }),

    initForUser: (userId) => {
      const data = readRecentNav(userId);
      set({ userId, recentGoals: data.goals, recentWorkspaces: data.workspaces });
    },

    clearRecentNav: () => {
      const { userId } = get();
      const empty: RecentNavSnapshot = { goals: [], workspaces: [] };
      writeRecentNav(empty, userId);
      set({ recentGoals: [], recentWorkspaces: [] });
    },

    removeStaleEntries: (validGoalIds, validWorkspaceIds) => {
      set(state => {
        const goals = state.recentGoals.filter(e => validGoalIds.has(e.goal.id));
        const workspaces = state.recentWorkspaces.filter(e => {
          if (!validGoalIds.has(e.goal.id)) return false;
          // Only check workspace ID when a non-empty set is provided
          if (validWorkspaceIds.size > 0 && !validWorkspaceIds.has(e.workspace.id)) return false;
          return true;
        });
        if (goals.length === state.recentGoals.length && workspaces.length === state.recentWorkspaces.length) {
          return state;
        }
        writeRecentNav({ goals, workspaces }, state.userId);
        return { recentGoals: goals, recentWorkspaces: workspaces };
      });
    },

    onGoalUpdate: (updated) => set(state => {
      const nextRecentGoals = state.recentGoals.map(entry =>
        entry.goal.id === updated.id ? { ...entry, goal: updated } : entry,
      );
      const nextRecentWorkspaces = state.recentWorkspaces.map(entry =>
        entry.goal.id === updated.id ? { ...entry, goal: updated } : entry,
      );
      writeRecentNav({ goals: nextRecentGoals, workspaces: nextRecentWorkspaces }, state.userId);
      if (state.navState.goal?.id === updated.id) {
        return {
          navState: { ...state.navState, goal: updated },
          recentGoals: nextRecentGoals,
          recentWorkspaces: nextRecentWorkspaces,
        };
      }
      return { recentGoals: nextRecentGoals, recentWorkspaces: nextRecentWorkspaces };
    }),

    onWorkspaceUpdate: (updated) => set(state => {
      const nextRecentWorkspaces = state.recentWorkspaces.map(entry =>
        entry.workspace.id === updated.id ? { ...entry, workspace: updated } : entry,
      );
      writeRecentNav({ goals: state.recentGoals, workspaces: nextRecentWorkspaces }, state.userId);
      if (state.navState.workspace?.id === updated.id) {
        return {
          navState: { ...state.navState, workspace: updated },
          recentWorkspaces: nextRecentWorkspaces,
        };
      }
      return { recentWorkspaces: nextRecentWorkspaces };
    }),

    toOverview:    () => navigate({ view: "overview" }),
    toGoals:       () => navigate({ view: "goals" }),
    toGoal:        (goal) => navigate({ view: "goal", goal }),
    toSubject:     (goal, subject) => navigate({ view: "subject", goal, subject }),
    toWorkspace:   (goal, subject, workspace) => navigate({ view: "workspace", goal, subject, workspace }),
    toSubjectsView:   () => navigate({ view: "subjects" }),
    toWorkspacesView: () => navigate({ view: "workspaces" }),
    toDocumentsView:  () => navigate({ view: "documents" }),
    toSummaryView:    () => navigate({ view: "summary" }),
    toRoadmapView:    () => navigate({ view: "roadmap" }),
    toSessionsView:   () => navigate({ view: "sessions" }),
    toFlashcardsView: () => navigate({ view: "flashcards" }),
    toQuizzesView:    () => navigate({ view: "quizzes" }),
    toNotesView:      () => navigate({ view: "notes" }),
    toGroups:      () => navigate({ view: "groups" }),
    toSettings:    () => navigate({ view: "settings" }),

    setWorkspaceTab: (tab) => set(state => {
      const next = { ...state.navState, tab };
      const recent = buildRecentSnapshot(state.recentGoals, state.recentWorkspaces, next);
      writeRecentNav(recent, state.userId);
      window.history.replaceState(next, "", navStateToPath(next));
      return {
        navState: next,
        recentGoals: recent.goals,
        recentWorkspaces: recent.workspaces,
      };
    }),
  };
});
