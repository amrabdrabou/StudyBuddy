import { useState, useEffect } from "react";
import Sidebar, { type NavState, type NavActions } from "../components/layout/Sidebar";
import type { Subject } from "../api/subjects";
import { getSubjects } from "../api/subjects";
import GoalsPage from "./GoalsPage";
import GoalDetailPage from "./GoalDetailPage";
import SubjectDetailPage from "./SubjectDetailPage";
import { WorkspaceDetail } from "./WorkspacesSection";
import OverviewSection from "./OverviewSection";
import GroupsSection from "./GroupsSection";
import SettingsSection from "./SettingsSection";

interface Props {
  initialSection?: string;
  onSignOut: () => void;
  onGoToHome?: () => void;
}

export default function DashboardPage({ onSignOut }: Props) {
  const [navState, setNavState] = useState<NavState>({ view: "goals" });
  const [_history, setHistory] = useState<NavState[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Load subjects globally so they're available everywhere
  useEffect(() => {
    getSubjects().then(setSubjects).catch(() => {});
  }, []);

  // Navigate and push current state to history
  const navigate = (next: NavState) => {
    setHistory(prev => [...prev, navState]);
    setNavState(next);
  };

  const goBack = () => {
    setHistory(prev => {
      if (prev.length === 0) return prev;
      const previous = prev[prev.length - 1];
      setNavState(previous);
      return prev.slice(0, -1);
    });
  };

  // Sidebar direct links bypass history (intentional top-level navigation)
  const navDirect = (next: NavState) => {
    setHistory([]);
    setNavState(next);
  };

  // Nav actions
  const nav: NavActions = {
    toOverview: () => navigate({ view: "overview" }),
    toGoals:    () => navigate({ view: "goals" }),
    toGoal:     (goal) => navigate({ view: "goal", goal }),
    toSubject:  (goal, subject) => navigate({ view: "subject", goal, subject }),
    toWorkspace:(goal, subject, workspace) => navigate({ view: "workspace", goal, subject, workspace }),
    toGroups:   () => navigate({ view: "groups" }),
    toSettings: () => navigate({ view: "settings" }),
    onGoalUpdate: (updated) => {
      setNavState(prev => {
        if (prev.goal?.id === updated.id) return { ...prev, goal: updated };
        return prev;
      });
    },
    goBack,
  };

  // Sidebar uses direct navigation (clears history)
  const sidebarNav: NavActions = {
    ...nav,
    toOverview: () => navDirect({ view: "overview" }),
    toGoals:    () => navDirect({ view: "goals" }),
    toGroups:   () => navDirect({ view: "groups" }),
    toSettings: () => navDirect({ view: "settings" }),
  };

  // Workspace detail needs subject — get from navState
  const wsSubject = navState.view === "workspace" ? navState.subject : undefined;

  // Suppress unused variable warning for subjects
  void subjects;

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <Sidebar navState={navState} nav={sidebarNav} onSignOut={onSignOut} />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <main className="flex-1 min-h-screen ml-60 flex flex-col">
        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-white/10 sticky top-0 z-30 bg-slate-950">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
          <span className="text-white font-bold text-sm">StudyBuddy</span>
        </div>

        {/* Page content */}
        <div className="flex-1 px-6 py-8 max-w-6xl w-full mx-auto">
          {navState.view === "overview" && (
            <OverviewSection
              toGoals={nav.toGoals}
              toGoal={nav.toGoal}
              toGroups={nav.toGroups}
            />
          )}

          {navState.view === "goals" && <GoalsPage nav={nav} />}

          {navState.view === "goal" && navState.goal && (
            <GoalDetailPage
              goal={navState.goal}
              nav={{
                toGoals: nav.toGoals,
                toSubject: nav.toSubject,
                onGoalUpdate: nav.onGoalUpdate,
                goBack,
              }}
            />
          )}

          {navState.view === "subject" && navState.goal && navState.subject && (
            <SubjectDetailPage
              goal={navState.goal}
              subject={navState.subject}
              nav={{
                toGoals: nav.toGoals,
                toGoal: nav.toGoal,
                toWorkspace: nav.toWorkspace,
                goBack,
              }}
            />
          )}

          {navState.view === "workspace" && navState.workspace && (
            <div className="space-y-6">
              {/* Breadcrumb */}
              {navState.goal && navState.subject && (
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <button onClick={nav.toGoals} className="text-gray-500 hover:text-white transition-colors">Missions</button>
                  <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                  <button onClick={() => nav.toGoal(navState.goal!)} className="text-gray-500 hover:text-white transition-colors truncate max-w-[100px]">{navState.goal.title}</button>
                  <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                  <button onClick={() => nav.toSubject(navState.goal!, navState.subject!)} className="text-gray-500 hover:text-white transition-colors truncate max-w-[100px]">{navState.subject.name}</button>
                  <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
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

          {navState.view === "groups" && <GroupsSection currentUserId="" />}
          {navState.view === "settings" && <SettingsSection />}
        </div>
      </main>
    </div>
  );
}
