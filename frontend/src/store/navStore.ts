import { create } from "zustand";
import type { BigGoal } from "../api/big_goals";
import type { Subject } from "../api/subjects";
import type { Workspace } from "../api/workspaces";

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function navStateToPath(s: NavState): string {
  switch (s.view) {
    case "overview":    return "/dashboard";
    case "goals":       return "/goals";
    case "goal":        return s.goal ? `/goals/${s.goal.id}` : "/goals";
    case "subject":     return s.goal && s.subject
      ? `/goals/${s.goal.id}/subjects/${s.subject.id}` : "/goals";
    case "workspace": {
      if (!s.goal || !s.subject || !s.workspace) return "/goals";
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
  // /goals/:id/subjects/:id/workspaces/:id/:tab
  const wsTabMatch = path.match(/^\/goals\/[^/]+\/subjects\/[^/]+\/workspaces\/[^/]+\/([^/]+)$/);
  if (wsTabMatch) return { view: "workspace", tab: wsTabMatch[1] };
  // /goals/:id/subjects/:id/workspaces/:id
  if (/^\/goals\/[^/]+\/subjects\/[^/]+\/workspaces\/[^/]+$/.test(path)) return { view: "workspace" };
  return { view: "goals" };
}

function resolveInitialNavState(): NavState {
  const s = window.history.state;
  if (s?.view) return s as NavState;
  return pathToNavState(window.location.pathname);
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface NavStore {
  navState: NavState;
  history: NavState[];
  sidebarOpen: boolean;

  // Core navigation
  navigate: (next: NavState) => void;
  /** Direct navigation — clears breadcrumb history (used by Sidebar top-level links). */
  navDirect: (next: NavState) => void;
  goBack: () => void;
  syncFromPopState: (state: NavState | null) => void;

  // UI
  setSidebarOpen: (open: boolean) => void;

  // State sync
  onGoalUpdate: (updated: BigGoal) => void;

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

export const useNavStore = create<NavStore>((set) => {
  function navigate(next: NavState) {
    set(state => ({ history: [...state.history, state.navState], navState: next }));
    window.history.pushState(next, "", navStateToPath(next));
  }

  function navDirect(next: NavState) {
    set({ history: [], navState: next });
    window.history.pushState(next, "", navStateToPath(next));
  }

  return {
    navState: resolveInitialNavState(),
    history: [],
    sidebarOpen: false,

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

    onGoalUpdate: (updated) => set(state => {
      if (state.navState.goal?.id === updated.id) {
        return { navState: { ...state.navState, goal: updated } };
      }
      return {};
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
      window.history.replaceState(next, "", navStateToPath(next));
      return { navState: next };
    }),
  };
});
