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

export default function GoalCard({ goal, subjects, onEdit, onDelete, onSetupWorkspace, onSelect }: {
  goal: BigGoal;
  subjects: Subject[];
  onEdit: (g: BigGoal) => void;
  onDelete: (g: BigGoal) => void;
  onSetupWorkspace: (g: BigGoal) => void;
  onSelect: (g: BigGoal) => void;
}) {
  const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s]));
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const color = goal.cover_color ?? "#6366f1";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(goal)}
      onKeyDown={e => e.key === "Enter" && onSelect(goal)}
      className="relative overflow-hidden rounded-2xl border cursor-pointer transition-all hover:scale-[1.01]"
      style={{
        background: `${color}0d`,
        borderColor: `${color}30`,
      }}
    >
      {/* Top accent bar */}
      <div className="h-1" style={{ background: color }} />

      <div className="p-5 space-y-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {goal.icon && (
              <span className="text-xl flex-shrink-0">{goal.icon}</span>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white leading-tight truncate">{goal.title}</p>
              {goal.description && (
                <p className="text-xs text-gray-500 mt-0.5 truncate">{goal.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {goal.pinned && (
              <span title="Pinned" className="text-amber-400">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                </svg>
              </span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(goal.status)}`}>
              {goal.status.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Progress</span>
            <span className="font-semibold" style={{ color }}>{goal.progress_pct}%</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${goal.progress_pct}%`, background: color }}
            />
          </div>
        </div>

        {/* Subjects */}
        {goal.subject_ids.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {goal.subject_ids.map(sid => (
              <span key={sid}
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: `${color}15`, color: color }}>
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
        <div className="flex gap-2 flex-wrap" onClick={stop}>
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
          <button
            onClick={() => onSetupWorkspace(goal)}
            className="text-xs px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Setup Workspace
          </button>

          <button onClick={() => onDelete(goal)}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors ml-auto">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
