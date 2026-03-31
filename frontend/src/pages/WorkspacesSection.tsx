import { useEffect, useState } from "react";
import { getWorkspaces, type Workspace } from "../api/workspaces";
import { getSubjects, type Subject } from "../api/subjects";
import { getBigGoals, type BigGoal } from "../api/big_goals";
import FilterPillGroup from "../components/ui/FilterPillGroup";
import MainCollectionPage from "../components/ui/MainCollectionPage";
import SkeletonGrid from "../components/ui/SkeletonGrid";
import WorkspaceCard from "../components/workspaces/WorkspaceCard";
import WorkspaceSetupModal from "../components/workspaces/WorkspaceSetupModal";
import { useNavStore } from "../store/navStore";

export default function WorkspacesSection() {
  const { toWorkspace } = useNavStore();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [goals, setGoals] = useState<BigGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    try {
      const [ws, subs, gs] = await Promise.all([getWorkspaces(), getSubjects(), getBigGoals()]);
      setWorkspaces(ws);
      setSubjects(subs);
      setGoals(gs);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const subjectMap = Object.fromEntries(subjects.map((subject) => [subject.id, subject]));
  const goalsBySubjectId = goals.reduce<Record<string, BigGoal[]>>((acc, goal) => {
    goal.subject_ids.forEach((subjectId) => {
      acc[subjectId] = [...(acc[subjectId] ?? []), goal];
    });
    return acc;
  }, {});

  const filtered = workspaces.filter((workspace) => {
    if (filterSubject !== "all" && workspace.subject_id !== filterSubject) return false;
    if (filterStatus !== "all" && workspace.status !== filterStatus) return false;
    return true;
  });

  return (
    <>
      <MainCollectionPage
        title="Workspaces"
        description={`${workspaces.length} workspace${workspaces.length !== 1 ? "s" : ""} - your long-running study containers`}
        actions={subjects.length > 0 ? (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-105 active:scale-95 flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)", boxShadow: "0 4px 20px rgba(139,92,246,0.3)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            New Workspace
          </button>
        ) : undefined}
        error={error}
        onDismissError={() => setError("")}
        filters={
          <>
            {subjects.length > 0 && (
              <FilterPillGroup
                options={[{ id: "all", label: "All Subjects" }, ...subjects.map((subject) => ({ id: subject.id, label: subject.name }))]}
                value={filterSubject}
                onChange={setFilterSubject}
                tone="violet"
              />
            )}

            <FilterPillGroup
              options={(["all", "active", "paused", "completed", "canceled"] as const).map((status) => ({ id: status, label: status }))}
              value={filterStatus}
              onChange={setFilterStatus}
              tone="violet"
              compact
            />
          </>
        }
        loading={loading}
        loadingFallback={<SkeletonGrid count={6} />}
        isEmpty={filtered.length === 0}
        emptyState={{
          tone: "violet",
          icon: (
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          ),
          title: workspaces.length === 0 ? "No workspaces yet" : "No matching workspaces",
          description: workspaces.length === 0 ? "Create a workspace to get started." : "Try adjusting the filters above.",
          action: workspaces.length === 0 && subjects.length > 0 ? (
            <button
              onClick={() => setShowCreate(true)}
              className="px-6 py-3 rounded-2xl font-bold text-white transition-colors"
              style={{ background: "#7c3aed" }}
            >
              Create First Workspace
            </button>
          ) : undefined,
        }}
      >
        {filtered.map((workspace) => (
          <WorkspaceCard
            key={workspace.id}
            workspace={workspace}
            subjects={subjects}
            onOpen={(selectedWorkspace) => {
              const subject = subjectMap[selectedWorkspace.subject_id];
              const goal = goalsBySubjectId[selectedWorkspace.subject_id]?.[0];

              if (!subject || !goal) {
                setError(`"${selectedWorkspace.title}" is missing a mission or subject link. Open it from a mission flow after linking the subject.`);
                return;
              }

              toWorkspace(goal, subject, selectedWorkspace);
            }}
          />
        ))}
      </MainCollectionPage>

      {subjects.length === 0 && !loading && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
          Create a subject first before making workspaces.
        </div>
      )}

      {showCreate && (
        <WorkspaceSetupModal
          titleSeed=""
          subjects={subjects}
          initialSubjectId={filterSubject !== "all" ? filterSubject : subjects[0]?.id}
          intro="Create a workspace to organise documents, notes, and sessions."
          onWorkspaceCreated={() => {
            void load();
          }}
          onClose={() => {
            setShowCreate(false);
            void load();
          }}
        />
      )}
    </>
  );
}
