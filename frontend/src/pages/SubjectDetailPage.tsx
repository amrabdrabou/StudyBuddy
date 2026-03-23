import { useState, useEffect } from "react";
import type { BigGoal } from "../api/big_goals";
import type { Subject } from "../api/subjects";
import { getWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace, type Workspace, type WorkspaceStatus } from "../api/workspaces";
import Modal from "../components/ui/Modal";

interface NavActions {
  toGoals: () => void;
  toGoal: (g: BigGoal) => void;
  toWorkspace: (g: BigGoal, s: Subject, w: Workspace) => void;
  goBack: () => void;
}

function wsStatusColor(status: string) {
  return {
    active:    "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
    paused:    "bg-amber-400/10 text-amber-400 border-amber-400/20",
    completed: "bg-blue-400/10 text-blue-400 border-blue-400/20",
    canceled:  "bg-red-400/10 text-red-400 border-red-400/20",
  }[status] ?? "bg-gray-400/10 text-gray-400 border-gray-400/20";
}

export default function SubjectDetailPage({
  goal, subject, nav,
}: { goal: BigGoal; subject: Subject; nav: NavActions }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle]     = useState("");
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");

  const color = subject.color_hex ?? "#6366f1";

  const load = async () => {
    try { setWorkspaces(await getWorkspaces({ subject_id: subject.id })); }
    catch { setError("Failed to load workspaces"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [subject.id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      const ws = await createWorkspace({ subject_id: subject.id, title: newTitle.trim() });
      setShowCreate(false); setNewTitle("");
      await load();
      nav.toWorkspace(goal, subject, ws);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (ws: Workspace, status: WorkspaceStatus) => {
    try { await updateWorkspace(ws.id, { status }); await load(); }
    catch { setError("Failed to update"); }
  };

  const handleDelete = async (ws: Workspace) => {
    if (!confirm(`Delete workspace "${ws.title}"? This removes all its content.`)) return;
    try { await deleteWorkspace(ws.id); await load(); }
    catch { setError("Failed to delete"); }
  };

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <button onClick={nav.goBack} className="text-gray-500 hover:text-white transition-colors">Missions</button>
        <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
        <button onClick={nav.goBack} className="text-gray-500 hover:text-white transition-colors truncate max-w-[120px]">{goal.title}</button>
        <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
        <span className="text-white font-medium">{subject.name}</span>
      </div>

      {/* Subject header */}
      <div className="relative overflow-hidden rounded-2xl border p-6"
        style={{ background: `${color}08`, borderColor: `${color}25` }}>
        <div className="h-0.5 absolute top-0 left-0 right-0" style={{ background: color }} />
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
            style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
            {subject.icon ?? "📚"}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">{subject.name}</h1>
            <p className="text-sm text-gray-400 mt-0.5">Part of <span className="text-white">{goal.title}</span></p>
          </div>
        </div>
      </div>

      {/* Workspaces section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Workspaces <span className="text-gray-600 font-normal text-sm ml-1">{workspaces.length}</span></h2>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl font-semibold text-white transition-colors"
            style={{ background: `${color}25`, border: `1px solid ${color}40` }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
            </svg>
            New Workspace
          </button>
        </div>

        {error && <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-sm border border-red-500/20">{error}</div>}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-36 rounded-2xl bg-white/[0.04] animate-pulse"/>)}
          </div>
        ) : workspaces.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl">🗂</div>
            <div>
              <p className="text-white font-semibold">No workspaces yet</p>
              <p className="text-gray-500 text-sm mt-1">Create a workspace to start organizing your study sessions</p>
            </div>
            <button onClick={() => setShowCreate(true)}
              className="px-4 py-2 rounded-xl text-white text-sm font-bold transition-colors"
              style={{ background: color }}>
              Create Workspace
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaces.map(ws => (
              <div key={ws.id}
                onClick={() => nav.toWorkspace(goal, subject, ws)}
                className="group p-5 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg bg-white/[0.04] hover:bg-white/[0.06]"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                    </svg>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border flex-shrink-0 ${wsStatusColor(ws.status)}`}>
                    {ws.status}
                  </span>
                </div>
                <p className="font-bold text-white mb-1">{ws.title}</p>
                <p className="text-[10px] text-gray-600 mb-4">
                  Created {new Date(ws.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold" style={{ color }}>Open →</p>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={e => e.stopPropagation()}>
                    {ws.status === "active" && (
                      <button onClick={() => handleStatusChange(ws, "paused")}
                        className="text-[10px] px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors">Pause</button>
                    )}
                    {ws.status === "paused" && (
                      <button onClick={() => handleStatusChange(ws, "active")}
                        className="text-[10px] px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">Resume</button>
                    )}
                    <button onClick={() => handleDelete(ws)}
                      className="text-[10px] px-2 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Workspace Modal */}
      {showCreate && (
        <Modal title="New Workspace" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <p className="text-xs text-gray-500">Creating workspace in <span className="text-white font-medium">{subject.name}</span></p>
            <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)} required
              placeholder="Workspace name… e.g. Week 3 Review"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"/>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowCreate(false)}
                className="flex-1 py-3 rounded-xl border border-white/15 text-gray-400 hover:text-white font-semibold text-sm transition-colors">Cancel</button>
              <button type="submit" disabled={saving || !newTitle.trim()}
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors disabled:opacity-50">
                {saving ? "Creating…" : "Create Workspace"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
