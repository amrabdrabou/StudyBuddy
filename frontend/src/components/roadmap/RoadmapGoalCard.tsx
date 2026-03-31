import type { MicroGoal, MicroGoalStatus } from "../../api/micro_goals";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";

export type RoadmapGoalItem = MicroGoal & { workspaceTitle: string };

function statusBadge(status: MicroGoalStatus) {
  if (status === "completed") return { label: "Completed", icon: "C", tone: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" };
  if (status === "in_progress") return { label: "In Progress", icon: "IP", tone: "text-blue-400 bg-blue-400/10 border-blue-400/20" };
  if (status === "pending") return { label: "Pending", icon: "P", tone: "text-amber-400 bg-amber-400/10 border-amber-400/20" };
  if (status === "skipped") return { label: "Skipped", icon: "S", tone: "text-gray-400 bg-gray-500/10 border-gray-400/20" };
  return { label: "Suggested", icon: "*", tone: "text-violet-400 bg-violet-400/10 border-violet-400/20" };
}

export default function RoadmapGoalCard({
  goal,
  showWorkspace,
  onAdvance,
  onDelete,
}: {
  goal: RoadmapGoalItem;
  showWorkspace: boolean;
  onAdvance: (goal: RoadmapGoalItem) => void;
  onDelete: (goal: RoadmapGoalItem) => void;
}) {
  const badge = statusBadge(goal.status);

  return (
    <Card className="group flex h-full flex-col hover:bg-white/[0.06] hover:border-violet-500/20 transition-all duration-200">
      <CardHeader className="items-start gap-3 p-5 pb-3">
        <button
          onClick={() => onAdvance(goal)}
          title={`Status: ${goal.status}`}
          className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border text-[11px] font-bold transition-colors ${badge.tone}`}
        >
          {badge.icon}
        </button>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2 flex-wrap">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badge.tone}`}>
              {badge.label}
            </span>
            {showWorkspace && (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                {goal.workspaceTitle}
              </span>
            )}
          </div>
          <CardTitle className={goal.status === "completed" ? "text-gray-500 line-through" : ""}>{goal.title}</CardTitle>
          {goal.description && <CardDescription className="mt-1 line-clamp-3">{goal.description}</CardDescription>}
        </div>
        <button
          onClick={() => onDelete(goal)}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
          title="Delete"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </CardHeader>
      <CardFooter className="mt-auto flex items-center justify-between pt-0 text-xs text-gray-600">
        <span>Step #{goal.order_index + 1}</span>
        <span>{new Date(goal.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
      </CardFooter>
    </Card>
  );
}
