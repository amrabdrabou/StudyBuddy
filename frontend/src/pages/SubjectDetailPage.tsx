import { useEffect, useState } from "react";
import type { BigGoal } from "../api/big_goals";
import type { Subject } from "../api/subjects";
import {
  createWorkspace,
  deleteWorkspace,
  getWorkspaces,
  updateWorkspace,
  type Workspace,
  type WorkspaceStatus,
} from "../api/workspaces";
import MainDetailPage from "../components/ui/MainDetailPage";
import Modal from "../components/ui/Modal";
import RenameModal from "../components/ui/RenameModal";
import { PageGrid, PageSection } from "../components/ui/pageLayout";
import { useNavStore } from "../store/navStore";

function wsStatusColor(status: string) {
  return {
    active: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
    paused: "bg-amber-400/10 text-amber-400 border-amber-400/20",
    completed: "bg-blue-400/10 text-blue-400 border-blue-400/20",
    canceled: "bg-red-400/10 text-red-400 border-red-400/20",
  }[status] ?? "bg-gray-400/10 text-gray-400 border-gray-400/20";
}

export default function SubjectDetailPage({ goal, subject }: { goal: BigGoal; subject: Subject }) {
  const { toGoal, toWorkspace, goBack } = useNavStore();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [renameWorkspace, setRenameWorkspace] = useState<Workspace | null>(null);
  const [renameSaving, setRenameSaving] = useState(false);
  const [renameError, setRenameError] = useState("");

  const color = subject.color_hex ?? "#6366f1";

  const load = async () => {
    try {
      setWorkspaces(await getWorkspaces({ subject_id: subject.id }));
    } catch {
      setError("Failed to load workspaces");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [subject.id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      const workspace = await createWorkspace({ subject_id: subject.id, title: newTitle.trim() });
      setShowCreate(false);
      setNewTitle("");
      await load();
      toWorkspace(goal, subject, workspace);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (workspace: Workspace, status: WorkspaceStatus) => {
    try {
      await updateWorkspace(workspace.id, { status });
      await load();
    } catch {
      setError("Failed to update");
    }
  };

  const handleDelete = async (workspace: Workspace) => {
    if (!confirm(`Delete workspace "${workspace.title}"? This removes all its content.`)) return;
    try {
      await deleteWorkspace(workspace.id);
      await load();
    } catch {
      setError("Failed to delete");
    }
  };

  const handleRename = async (title: string) => {
    if (!renameWorkspace) return;
    setRenameSaving(true);
    setRenameError("");
    try {
      const updated = await updateWorkspace(renameWorkspace.id, { title });
      setWorkspaces((prev) => prev.map((workspace) => (workspace.id === updated.id ? updated : workspace)));
      setRenameWorkspace(null);
    } catch (e: unknown) {
      setRenameError(e instanceof Error ? e.message : "Failed to rename workspace");
    } finally {
      setRenameSaving(false);
    }
  };

  return (
    <MainDetailPage
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <button onClick={goBack} className="text-gray-500 hover:text-white transition-colors">
            Missions
          </button>
          <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <button onClick={() => toGoal(goal)} className="text-gray-500 hover:text-white transition-colors truncate max-w-[120px]">
            {goal.title}
          </button>
          <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-white font-medium truncate max-w-[160px]">{subject.name}</span>
        </div>
      }
      title={subject.name}
      description={
        <>
          Part of <span className="text-white">{goal.title}</span>
        </>
      }
      icon={<span className="text-3xl">{subject.icon ?? "S"}</span>}
      accentColor={color}
      error={error}
      onDismissError={() => setError("")}
    >
      <PageSection>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            Workspaces <span className="text-gray-600 font-normal text-sm ml-1">{workspaces.length}</span>
          </h2>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl font-semibold text-white transition-colors"
            style={{ background: `${color}25`, border: `1px solid ${color}40` }}
          >
            New Workspace
          </button>
        </div>

        {loading ? (
          <PageGrid>
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-36 rounded-2xl bg-white/[0.04] animate-pulse" />
            ))}
          </PageGrid>
        ) : workspaces.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-sm">WS</div>
            <div>
              <p className="text-white font-semibold">No workspaces yet</p>
              <p className="text-gray-500 text-sm mt-1">Create a workspace to start organizing your study sessions.</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 rounded-xl text-white text-sm font-bold transition-colors"
              style={{ background: color }}
            >
              Create Workspace
            </button>
          </div>
        ) : (
          <PageGrid>
            {workspaces.map((workspace) => (
              <div
                key={workspace.id}
                onClick={() => toWorkspace(goal, subject, workspace)}
                className="group p-5 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg bg-white/[0.04] hover:bg-white/[0.06]"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 text-sm">
                    WS
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border flex-shrink-0 ${wsStatusColor(workspace.status)}`}>
                    {workspace.status}
                  </span>
                </div>
                <p className="font-bold text-white mb-1">{workspace.title}</p>
                <p className="text-[10px] text-gray-600 mb-4">
                  Created {new Date(workspace.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold" style={{ color }}>
                    Open -&gt;
                  </p>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setRenameError("");
                        setRenameWorkspace(workspace);
                      }}
                      className="text-[10px] px-2 py-1 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 transition-colors"
                    >
                      Rename
                    </button>
                    {workspace.status === "active" && (
                      <button
                        onClick={() => void handleStatusChange(workspace, "paused")}
                        className="text-[10px] px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                      >
                        Pause
                      </button>
                    )}
                    {workspace.status === "paused" && (
                      <button
                        onClick={() => void handleStatusChange(workspace, "active")}
                        className="text-[10px] px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                      >
                        Resume
                      </button>
                    )}
                    <button
                      onClick={() => void handleDelete(workspace)}
                      className="text-[10px] px-2 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </PageGrid>
        )}
      </PageSection>

      {showCreate && (
        <Modal title="New Workspace" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <p className="text-xs text-gray-500">
              Creating workspace in <span className="text-white font-medium">{subject.name}</span>
            </p>
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
              placeholder="Workspace name..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
            />
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="flex-1 py-3 rounded-xl border border-white/15 text-gray-400 hover:text-white font-semibold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !newTitle.trim()}
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create Workspace"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {renameWorkspace && (
        <RenameModal
          title="Rename Workspace"
          label="Workspace title"
          initialValue={renameWorkspace.title}
          placeholder="Workspace title"
          confirmLabel="Save Workspace"
          saving={renameSaving}
          error={renameError}
          onClose={() => {
            setRenameWorkspace(null);
            setRenameError("");
          }}
          onSubmit={handleRename}
        />
      )}
    </MainDetailPage>
  );
}
