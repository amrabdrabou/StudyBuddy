import { useEffect } from "react";
import { useNavStore } from "../store/navStore";
import Sidebar from "../components/layout/Sidebar";
import TopBar from "../components/layout/TopBar";
import GoalsPage from "./GoalsPage";
import GoalDetailPage from "./GoalDetailPage";
import SubjectDetailPage from "./SubjectDetailPage";
import WorkspacesSection, { WorkspaceDetail } from "./WorkspacesSection";
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

interface Props {
  onSignOut: () => Promise<void>;
}

export default function DashboardPage({ onSignOut }: Props) {
  const {
    navState,
    goBack,
    toGoals,
    toGoal,
    toSubject,
    sidebarOpen,
    setSidebarOpen,
    syncFromPopState,
  } = useNavStore();

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

  const wsSubject = navState.view === "workspace" ? navState.subject : undefined;

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
      <main className="flex-1 min-h-screen ml-60 flex flex-col">
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
        <div className="flex-1 px-6 py-8 max-w-6xl w-full mx-auto">
          {navState.view === "overview" && <OverviewSection />}

          {navState.view === "goals" && <GoalsPage />}

          {navState.view === "goal" && navState.goal && (
            <GoalDetailPage goal={navState.goal} />
          )}

          {navState.view === "subject" && navState.goal && navState.subject && (
            <SubjectDetailPage goal={navState.goal} subject={navState.subject} />
          )}

          {navState.view === "workspace" && navState.workspace && (
            <div className="space-y-6">
              {/* Breadcrumb */}
              {navState.goal && navState.subject && (
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <button
                    onClick={toGoals}
                    className="text-gray-500 hover:text-white transition-colors"
                  >
                    Missions
                  </button>
                  <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                  <button
                    onClick={() => toGoal(navState.goal!)}
                    className="text-gray-500 hover:text-white transition-colors truncate max-w-[100px]"
                  >
                    {navState.goal.title}
                  </button>
                  <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                  <button
                    onClick={() => toSubject(navState.goal!, navState.subject!)}
                    className="text-gray-500 hover:text-white transition-colors truncate max-w-[100px]"
                  >
                    {navState.subject.name}
                  </button>
                  <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-white font-medium">{navState.workspace.title}</span>
                </div>
              )}
              <WorkspaceDetail
                workspace={navState.workspace}
                subject={wsSubject}
                onBack={goBack}
                onDeleted={goBack}
              />
            </div>
          )}

          {navState.view === "subjects"   && <SubjectsSection />}
          {navState.view === "workspaces" && <WorkspacesSection />}
          {navState.view === "documents"  && <DocumentsSection />}
          {navState.view === "summary"    && <SummarySection />}
          {navState.view === "roadmap"    && <RoadmapSection />}
          {navState.view === "sessions"   && <SessionsSection subjects={[]} />}
          {navState.view === "flashcards" && <FlashcardsSection />}
          {navState.view === "quizzes"    && <QuizzesSection />}
          {navState.view === "notes"      && <NotesSection />}
          {navState.view === "groups"     && <GroupsSection currentUserId="" />}
          {navState.view === "settings"   && <SettingsSection />}
        </div>
      </main>
    </div>
  );
}
