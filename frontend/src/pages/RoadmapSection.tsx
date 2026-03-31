import { useEffect, useMemo, useState } from "react";
import { getWorkspaces, type Workspace } from "../api/workspaces";
import {
  getMicroGoals,
  updateMicroGoal,
  deleteMicroGoal,
  type MicroGoalStatus,
} from "../api/micro_goals";
import StatCard from "../components/dashboard/StatCard";
import RoadmapGoalCard, { type RoadmapGoalItem } from "../components/roadmap/RoadmapGoalCard";
import ErrorBanner from "../components/ui/ErrorBanner";
import SkeletonGrid from "../components/ui/SkeletonGrid";
import { useNavStore } from "../store/navStore";

const CYCLE: MicroGoalStatus[] = ["suggested", "pending", "in_progress", "completed"];
const ALL_WORKSPACES = "all-workspaces";

type Filter = "all" | "pending" | "in_progress" | "completed";

function RoadmapWorkspaceView({
  workspaces,
  workspaceId,
  filter,
}: {
  workspaces: Workspace[];
  workspaceId: string;
  filter: Filter;
}) {
  const [goals, setGoals] = useState<RoadmapGoalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isAllView = workspaceId === ALL_WORKSPACES;
  const selectedWorkspace = isAllView ? null : workspaces.find((workspace) => workspace.id === workspaceId) ?? null;

  useEffect(() => {
    if (!workspaceId) return;
    loadGoals();
  }, [workspaceId, workspaces]);

  async function loadGoals() {
    if (!workspaceId) return;

    setLoading(true);
    setError("");

    try {
      if (isAllView) {
        const allGoals = await Promise.all(
          workspaces.map(async (workspace) => {
            const data = await getMicroGoals(workspace.id);
            return data.map((goal) => ({ ...goal, workspaceTitle: workspace.title }));
          }),
        );

        setGoals(
          allGoals
            .flat()
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
        );
      } else if (selectedWorkspace) {
        const data = await getMicroGoals(selectedWorkspace.id);
        setGoals(
          [...data]
            .sort((a, b) => a.order_index - b.order_index)
            .map((goal) => ({ ...goal, workspaceTitle: selectedWorkspace.title })),
        );
      } else {
        setGoals([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load goals");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusToggle(goal: RoadmapGoalItem) {
    const next = CYCLE[(CYCLE.indexOf(goal.status) + 1) % CYCLE.length];
    try {
      await updateMicroGoal(goal.workspace_id, goal.id, { status: next });
      await loadGoals();
    } catch {
      // keep current list on silent failure
    }
  }

  async function handleDelete(goal: RoadmapGoalItem) {
    try {
      await deleteMicroGoal(goal.workspace_id, goal.id);
      await loadGoals();
    } catch {
      // keep current list on silent failure
    }
  }

  const counts: Record<Filter, number> = {
    all: goals.length,
    pending: goals.filter((goal) => goal.status === "pending").length,
    in_progress: goals.filter((goal) => goal.status === "in_progress").length,
    completed: goals.filter((goal) => goal.status === "completed").length,
  };

  const filteredGoals = useMemo(() => {
    if (filter === "all") return goals;
    return goals.filter((goal) => goal.status === filter);
  }, [filter, goals]);

  return (
    <div className="flex flex-col gap-6">
      {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}

      {!loading && goals.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[ 
            { label: "Roadmap Steps", value: goals.length, color: "text-violet-400" },
            { label: "In Progress", value: counts.in_progress, color: "text-blue-400" },
            { label: "Completed", value: counts.completed, color: "text-emerald-400" },
          ].map((stat) => (
            <StatCard key={stat.label} label={stat.label} value={stat.value} accent={stat.color} />
          ))}
        </div>
      )}

      {loading ? (
        <SkeletonGrid cols={3} count={6} height="h-40" />
      ) : filteredGoals.length === 0 ? (
        <RoadmapEmptyState
          title={filter === "all" ? "No roadmap steps yet" : `No ${filter.replace("_", " ")} steps`}
          description="Create roadmap steps from inside a workspace, then review and update them here."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGoals.map((goal) => (
            <RoadmapGoalCard
              key={goal.id}
              goal={goal}
              showWorkspace={isAllView}
              onAdvance={handleStatusToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function RoadmapSection() {
  const { navDirect } = useNavStore();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState(ALL_WORKSPACES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    loadWorkspaces();
  }, []);

  async function loadWorkspaces() {
    setLoading(true);
    try {
      const loaded = await getWorkspaces();
      setWorkspaces(loaded);
      setWorkspaceId(loaded.length > 0 ? ALL_WORKSPACES : "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load workspaces");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-8 pb-24">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Roadmap</h1>
        <p className="text-sm mt-1 text-gray-500">
          {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""} · review roadmap progress across your workspaces
        </p>
      </div>

      {workspaces.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setWorkspaceId(ALL_WORKSPACES)}
            className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
            style={
              workspaceId === ALL_WORKSPACES
                ? { background: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.3)" }
                : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.08)" }
            }
          >
            All
          </button>
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              onClick={() => setWorkspaceId(workspace.id)}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              style={
                workspaceId === workspace.id
                  ? { background: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.3)" }
                  : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.08)" }
              }
            >
              {workspace.title}
            </button>
          ))}
        </div>
      )}

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {workspaces.length === 0 && !loading ? (
        <RoadmapWorkspaceEmptyState onGoToWorkspaces={() => navDirect({ view: "workspaces" })} />
      ) : workspaceId ? (
        <>
          <div className="flex gap-2 flex-wrap">
            {(["all", "pending", "in_progress", "completed"] as Filter[]).map((value) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors capitalize ${
                  filter === value
                    ? "bg-violet-500/20 text-violet-300 border border-violet-400/30"
                    : "text-gray-500 hover:text-white hover:bg-white/[0.05] border border-transparent"
                }`}
              >
                {value.replace("_", " ")}
              </button>
            ))}
          </div>

          <RoadmapWorkspaceView
            key={`${workspaceId}-${workspaces.length}`}
            workspaces={workspaces}
            workspaceId={workspaceId}
            filter={filter}
          />
        </>
      ) : loading ? (
        <SkeletonGrid cols={3} count={3} height="h-40" />
      ) : null}
    </div>
  );
}

function RoadmapEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-6 py-24 text-center">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center"
        style={{ background: "rgba(139,92,246,0.10)", border: "1px solid rgba(139,92,246,0.22)" }}
      >
        <svg className="w-10 h-10 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 01.553-.894L9 2m0 18l6-3m-6 3V2m6 15l5.447-2.724A1 1 0 0021 13.382V2.618a1 1 0 00-.553-.894L15 0m0 17V0m0 0L9 2" />
        </svg>
      </div>
      <div className="space-y-1.5 max-w-sm">
        <p className="text-white font-bold text-xl">{title}</p>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>{description}</p>
      </div>
    </div>
  );
}

function RoadmapWorkspaceEmptyState({ onGoToWorkspaces }: { onGoToWorkspaces: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 py-32 text-center">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center"
        style={{ background: "rgba(139,92,246,0.10)", border: "1px solid rgba(139,92,246,0.22)" }}
      >
        <svg className="w-10 h-10 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 01.553-.894L9 2m0 18l6-3m-6 3V2m6 15l5.447-2.724A1 1 0 0021 13.382V2.618a1 1 0 00-.553-.894L15 0m0 17V0m0 0L9 2" />
        </svg>
      </div>
      <div className="space-y-1.5 max-w-sm">
        <p className="text-white font-bold text-xl">No workspaces yet</p>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
          Create a workspace first, then review its roadmap from here.
        </p>
      </div>
      <button
        onClick={onGoToWorkspaces}
        className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white text-sm active:scale-95 transition-transform"
        style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)", boxShadow: "0 4px 20px rgba(167,139,250,0.35)" }}
      >
        Open a Workspace
      </button>
    </div>
  );
}
