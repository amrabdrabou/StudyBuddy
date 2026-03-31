import { useEffect, useState } from "react";
import { getWorkspaces } from "../api/workspaces";
import { getSubjects } from "../api/subjects";
import { getBigGoals } from "../api/big_goals";
import { useNavStore } from "../store/navStore";
import Sidebar from "../components/layout/Sidebar";
import TopBar from "../components/layout/TopBar";
import GoalsPage from "./GoalsPage";
import GoalDetailPage from "./GoalDetailPage";
import SubjectDetailPage from "./SubjectDetailPage";
import WorkspacesSection from "./WorkspacesSection";
import { WorkspaceDetail } from "./WorkspaceDetailPage";
import OverviewSection from "./OverviewSection";
import SubjectsSection from "./SubjectsSection";
import DocumentsSection from "./DocumentsSection";
import SummarySection from "./SummarySection";
import RoadmapSection from "./RoadmapSection";
import SessionsSection from "./SessionsSection";
import FlashcardsSection from "./FlashcardsSection";
import QuizzesSection from "./QuizzesSection";
import NotesSection from "./NotesSection";
import GroupsSection from "./GroupsSection";
import SettingsSection from "./SettingsSection";
import MissionRequiredGate from "../components/ui/MissionRequiredGate";
import { matchGoalPath, matchSubjectPath, matchWorkspacePath } from "../store/navPaths";

interface Props {
  onSignOut: () => Promise<void>;
}

export default function DashboardPage({ onSignOut }: Props) {
  const {
    navState,
    goBack,
    sidebarOpen,
    setSidebarOpen,
    syncFromPopState,
  } = useNavStore();
  const [hydratingRoute, setHydratingRoute] = useState(false);

  // Sync from current URL on every mount (handles navigating back from home page)
  useEffect(() => {
    syncFromPopState(window.history.state);
  }, [syncFromPopState]);

  // Sync store when browser Back/Forward is used
  useEffect(() => {
    const onPop = (e: PopStateEvent) => syncFromPopState(e.state);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [syncFromPopState]);

  useEffect(() => {
    const pathname = window.location.pathname;
    const goalMatch = matchGoalPath(pathname);
    const subjectMatch = matchSubjectPath(pathname);
    const workspaceMatch = matchWorkspacePath(pathname);

    const needsGoalHydration = navState.view === "goal" && !navState.goal && Boolean(goalMatch);
    const needsSubjectHydration = navState.view === "subject" && (!navState.goal || !navState.subject) && Boolean(subjectMatch);
    const needsWorkspaceHydration =
      navState.view === "workspace" &&
      (!navState.goal || !navState.subject || !navState.workspace) &&
      Boolean(workspaceMatch);

    if (!needsGoalHydration && !needsSubjectHydration && !needsWorkspaceHydration) return;

    let cancelled = false;

    const hydrateRoute = async () => {
      setHydratingRoute(true);
      try {
        const [goals, subjects, workspaces] = await Promise.all([
          getBigGoals(),
          getSubjects(),
          getWorkspaces(),
        ]);
        if (cancelled) return;

        if (goalMatch) {
          const goal = goals.find((item) => item.id === goalMatch.goalId);
          syncFromPopState(goal ? { view: "goal", goal } : { view: "goals" });
          return;
        }

        if (subjectMatch) {
          const goal = goals.find((item) => item.id === subjectMatch.goalId);
          const subject = subjects.find((item) => item.id === subjectMatch.subjectId);
          if (!goal || !subject || !goal.subject_ids.includes(subject.id)) {
            syncFromPopState(goal ? { view: "goal", goal } : { view: "goals" });
            return;
          }
          syncFromPopState({ view: "subject", goal, subject });
          return;
        }

        if (workspaceMatch) {
          const goal = goals.find((item) => item.id === workspaceMatch.goalId);
          const subject = subjects.find((item) => item.id === workspaceMatch.subjectId);
          const workspace = workspaces.find((item) => item.id === workspaceMatch.workspaceId);
          const tab = workspaceMatch.tab;

          if (!goal || !subject || !workspace) {
            syncFromPopState(goal ? { view: "goal", goal } : { view: "goals" });
            return;
          }

          if (!goal.subject_ids.includes(subject.id) || workspace.subject_id !== subject.id) {
            syncFromPopState({ view: "subject", goal, subject });
            return;
          }

          syncFromPopState({ view: "workspace", goal, subject, workspace, tab });
        }
      } finally {
        if (!cancelled) setHydratingRoute(false);
      }
    };

    void hydrateRoute();
    return () => {
      cancelled = true;
    };
  }, [navState.goal, navState.subject, navState.view, navState.workspace, syncFromPopState]);

  const workspaceSubject = navState.view === "workspace" ? navState.subject : undefined;
  const loadingLabel = navState.view === "workspace"
    ? "workspace"
    : navState.view === "subject"
      ? "subject"
      : navState.view === "goal"
        ? "mission"
        : "section";

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <Sidebar onSignOut={onSignOut} />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main
        className="ml-0 flex-1 min-h-screen flex-col md:ml-[var(--sb-w,56px)]"
        style={{ transition: `margin-left 400ms cubic-bezier(0.25,1.1,0.4,1)` }}
      >
        {/* Desktop header */}
        <TopBar onSignOut={onSignOut} />

        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-white/10 sticky top-0 z-30 bg-slate-950">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-white font-bold text-sm">StudyBuddy</span>
        </div>

        {/* Page content */}
        <div className="flex-1 w-full">
          {navState.view === "overview" && <OverviewSection />}

          {navState.view !== "overview" && (
            <div className="max-w-5xl mx-auto w-full px-8 py-8 pb-28">
              {navState.view === "goals" && <GoalsPage />}

              {navState.view === "goal" && navState.goal && (
                <GoalDetailPage goal={navState.goal} />
              )}

              {navState.view === "subject" && navState.goal && navState.subject && (
                <SubjectDetailPage goal={navState.goal} subject={navState.subject} />
              )}

              {navState.view === "workspace" && navState.workspace && (
                <div className="space-y-6">
                  <WorkspaceDetail
                    workspace={navState.workspace}
                    subject={workspaceSubject}
                    onBack={goBack}
                    onDeleted={goBack}
                  />
                </div>
              )}

              {hydratingRoute && (
                <div className="text-sm text-gray-500">
                  Loading {loadingLabel}...
                </div>
              )}

              {navState.view === "subjects"   && <MissionRequiredGate feature="Subjects"><SubjectsSection /></MissionRequiredGate>}
              {navState.view === "workspaces" && <MissionRequiredGate feature="Workspaces"><WorkspacesSection /></MissionRequiredGate>}
              {navState.view === "documents"  && <MissionRequiredGate feature="Documents"><DocumentsSection /></MissionRequiredGate>}
              {navState.view === "summary"    && <MissionRequiredGate feature="Summary"><SummarySection /></MissionRequiredGate>}
              {navState.view === "roadmap"    && <MissionRequiredGate feature="Road Map"><RoadmapSection /></MissionRequiredGate>}
              {navState.view === "sessions"   && <MissionRequiredGate feature="Sessions"><SessionsSection /></MissionRequiredGate>}
              {navState.view === "flashcards" && <MissionRequiredGate feature="Flashcards"><FlashcardsSection /></MissionRequiredGate>}
              {navState.view === "quizzes"    && <MissionRequiredGate feature="Quizzes"><QuizzesSection /></MissionRequiredGate>}
              {navState.view === "notes"      && <MissionRequiredGate feature="Notes"><NotesSection /></MissionRequiredGate>}
              {navState.view === "groups"     && <GroupsSection currentUserId="" />}
              {navState.view === "settings"   && <SettingsSection />}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
