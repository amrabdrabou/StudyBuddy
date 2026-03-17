import type { BigGoal, BigGoalStatus } from "../../api/big_goals";
import type { Subject } from "../../api/subjects";

export function statusColor(status: BigGoalStatus) {
  switch (status) {
    case "active":             return "text-emerald-400 bg-emerald-400/10";
    case "paused":             return "text-amber-400 bg-amber-400/10";
    case "completed":          return "text-blue-400 bg-blue-400/10";
    case "canceled":           return "text-red-400 bg-red-400/10";
    case "overdue":            return "text-red-400 bg-red-400/10";
    case "ready_to_complete":  return "text-cyan-400 bg-cyan-400/10";
    default:                   return "text-gray-400 bg-gray-400/10";
  }
}

export default function GoalCard({ goal, subjects, onEdit, onDelete }: {
  goal: BigGoal;
  subjects: Subject[];
  onEdit: (g: BigGoal) => void;
  onDelete: (g: BigGoal) => void;
}) {
  const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s]));

  return (
    <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">{goal.title}</p>
          {goal.description && <p className="text-xs text-gray-500 mt-0.5">{goal.description}</p>}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusColor(goal.status)}`}>
          {goal.status.replace("_", " ")}
        </span>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Progress</span><span>{goal.progress_pct}%</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${goal.progress_pct}%` }} />
        </div>
      </div>

      {/* Subjects */}
      {goal.subject_ids.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {goal.subject_ids.map(sid => (
            <span key={sid} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400">
              {subjectMap[sid]?.name ?? sid.slice(0, 8)}
            </span>
          ))}
        </div>
      )}

      {goal.deadline && (
        <p className="text-xs text-gray-500">
          Due {new Date(goal.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {goal.status === "active" && (
          <>
            <button onClick={() => onEdit({ ...goal, status: "completed" as BigGoalStatus })}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors">
              Complete
            </button>
            <button onClick={() => onEdit({ ...goal, status: "paused" as BigGoalStatus })}
              className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors">
              Pause
            </button>
          </>
        )}
        {goal.status === "paused" && (
          <button onClick={() => onEdit({ ...goal, status: "active" as BigGoalStatus })}
            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
            Resume
          </button>
        )}
        <button onClick={() => onDelete(goal)}
          className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors ml-auto">
          Delete
        </button>
      </div>
    </div>
  );
}
