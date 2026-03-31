import type { Workspace } from "../../api/workspaces";
import type { Subject } from "../../api/subjects";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { getWorkspaceStatusClass } from "../ui/themeTokens";
import { fmtDate } from "../ui/utils";

export default function WorkspaceCard({ workspace, subjects, onOpen, onDelete: _onDelete }: {
  workspace: Workspace;
  subjects: Subject[];
  onOpen: (w: Workspace) => void;
  onDelete?: (w: Workspace) => void;
}) {
  const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s]));

  return (
    <Card onClick={() => onOpen(workspace)}
      className="text-left hover:bg-white/8 hover:border-violet-500/30 transition-all group cursor-pointer">
      <CardHeader className="p-5 pb-3">
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
          <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getWorkspaceStatusClass(workspace.status)}`}>
          {workspace.status}
        </span>
      </CardHeader>
      <CardContent className="space-y-3 p-5 pt-0">
        <div>
          <CardTitle className="group-hover:text-violet-300 transition-colors">{workspace.title}</CardTitle>
          <CardDescription className="mt-0.5">{subjectMap[workspace.subject_id]?.name ?? "Unknown subject"}</CardDescription>
        </div>
        <p className="text-xs text-gray-600">{fmtDate(workspace.updated_at)}</p>
      </CardContent>
    </Card>
  );
}
