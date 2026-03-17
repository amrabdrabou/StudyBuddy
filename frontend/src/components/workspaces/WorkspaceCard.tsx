import type { Workspace } from "../../api/workspaces";
import type { Subject } from "../../api/subjects";
import { fmtDate } from "../ui/utils";

function statusColor(status: string) {
  switch (status) {
    case "active":     return "text-emerald-400 bg-emerald-400/10";
    case "paused":     return "text-amber-400 bg-amber-400/10";
    case "completed":  return "text-blue-400 bg-blue-400/10";
    case "canceled":   return "text-red-400 bg-red-400/10";
    default:           return "text-slate-400 bg-slate-400/10";
  }
}

export default function WorkspaceCard({ workspace, subjects, onOpen, onDelete: _onDelete }: {
  workspace: Workspace;
  subjects: Subject[];
  onOpen: (w: Workspace) => void;
  onDelete: (w: Workspace) => void;
}) {
  const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s]));

  return (
    <button onClick={() => onOpen(workspace)}
      className="text-left p-5 bg-white/5 hover:bg-white/8 border border-white/5 hover:border-violet-500/30 rounded-2xl transition-all group space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
          <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(workspace.status)}`}>
          {workspace.status}
        </span>
      </div>
      <div>
        <p className="text-sm font-semibold text-white group-hover:text-violet-300 transition-colors">{workspace.title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{subjectMap[workspace.subject_id]?.name ?? "Unknown subject"}</p>
      </div>
      <p className="text-xs text-gray-600">{fmtDate(workspace.updated_at)}</p>
    </button>
  );
}
