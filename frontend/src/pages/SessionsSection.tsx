import { useState, useEffect } from "react";
import {
  getSessions, updateSession, deleteSession,
  type Session, type SessionStatus,
} from "../api/sessions";
import { getWorkspaces, type Workspace } from "../api/workspaces";
import Modal from "../components/ui/Modal";
import Field from "../components/ui/Field";
import ErrorBanner from "../components/ui/ErrorBanner";
import PageEmptyState from "../components/ui/PageEmptyState";
import SkeletonGrid from "../components/ui/SkeletonGrid";
import SessionCard from "../components/sessions/SessionCard";
import { useNavStore } from "../store/navStore";

const inputCls =
  "w-full rounded-xl bg-white/[0.08] border border-white/15 px-4 py-3 text-white " +
  "placeholder:text-gray-600 outline-none text-sm " +
  "focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition [&>option]:bg-slate-800";

const ALL_WORKSPACES = "all-workspaces";

type Filter = "all" | SessionStatus;
type SessionListItem = Session & { workspaceTitle: string };

export default function SessionsSection() {
  const { navDirect } = useNavStore();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState(ALL_WORKSPACES);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const [editTarget, setEditTarget] = useState<SessionListItem | null>(null);
  const [editForm, setEditForm] = useState({ title: "", status: "active" as SessionStatus, notes_text: "", mood_rating: "", productivity_rating: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<SessionListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadWorkspaces(); }, []);
  useEffect(() => { if (workspaceId) loadSessions(); }, [workspaceId, workspaces]);

  async function loadWorkspaces() {
    setLoading(true);
    try {
      const ws = await getWorkspaces();
      setWorkspaces(ws);
      setWorkspaceId(ws.length > 0 ? ALL_WORKSPACES : "");
      if (ws.length === 0) setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load workspaces");
      setLoading(false);
    }
  }

  async function loadSessions() {
    if (!workspaceId) return;
    setLoading(true);
    try {
      if (workspaceId === ALL_WORKSPACES) {
        const grouped = await Promise.all(
          workspaces.map(async (workspace) => {
            const items = await getSessions(workspace.id);
            return items.map((session) => ({ ...session, workspaceTitle: workspace.title }));
          }),
        );
        setSessions(
          grouped
            .flat()
            .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()),
        );
      } else {
        const currentWorkspace = workspaces.find((workspace) => workspace.id === workspaceId);
        if (!currentWorkspace) {
          setSessions([]);
        } else {
          const items = await getSessions(workspaceId);
          setSessions(items.map((session) => ({ ...session, workspaceTitle: currentWorkspace.title })));
        }
      }
    }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to load sessions"); }
    finally { setLoading(false); }
  }

  function openEdit(session: SessionListItem) {
    setEditTarget(session);
    setEditForm({
      title: session.title ?? "",
      status: session.status,
      notes_text: session.notes_text ?? "",
      mood_rating: session.mood_rating?.toString() ?? "",
      productivity_rating: session.productivity_rating?.toString() ?? "",
    });
    setEditErr(null);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setEditSaving(true); setEditErr(null);
    try {
      const updated = await updateSession(editTarget.workspace_id, editTarget.id, {
        title: editForm.title.trim() || undefined,
        status: editForm.status,
        notes_text: editForm.notes_text.trim() || null,
        mood_rating: editForm.mood_rating ? Number(editForm.mood_rating) : null,
        productivity_rating: editForm.productivity_rating ? Number(editForm.productivity_rating) : null,
      });
      setSessions(prev => prev.map(s => s.id === updated.id ? { ...updated, workspaceTitle: s.workspaceTitle } : s));
      setEditTarget(null);
    } catch (e) { setEditErr(e instanceof Error ? e.message : "Failed"); }
    finally { setEditSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSession(deleteTarget.workspace_id, deleteTarget.id);
      setSessions(prev => prev.filter(s => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); setDeleteTarget(null); }
    finally { setDeleting(false); }
  }

  const filtered = filter === "all" ? sessions : sessions.filter(s => s.status === filter);
  const counts: Record<Filter, number> = {
    all: sessions.length,
    active: sessions.filter(s => s.status === "active").length,
    paused: sessions.filter(s => s.status === "paused").length,
    completed: sessions.filter(s => s.status === "completed").length,
    abandoned: sessions.filter(s => s.status === "abandoned").length,
  };

  return (
    <div className="flex flex-col gap-8 pb-24">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Study Sessions</h1>
        <p className="text-sm mt-1 text-gray-500">
          {sessions.length} session{sessions.length !== 1 ? "s" : ""} · review your focused study time
        </p>
      </div>

      {workspaces.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setWorkspaceId(ALL_WORKSPACES)}
            className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
            style={workspaceId === ALL_WORKSPACES
              ? { background: "rgba(52,211,153,0.15)", color: "#34d399", border: "1px solid rgba(52,211,153,0.3)" }
              : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            All
          </button>
          {workspaces.map(ws => (
            <button
              key={ws.id}
              onClick={() => setWorkspaceId(ws.id)}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              style={workspaceId === ws.id
                ? { background: "rgba(52,211,153,0.15)", color: "#34d399", border: "1px solid rgba(52,211,153,0.3)" }
                : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.08)" }
              }
            >
              {ws.title}
            </button>
          ))}
        </div>
      )}

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {workspaces.length === 0 && !loading ? (
        <PageEmptyState
          title="No workspaces yet"
          description="Create a workspace first, then start study sessions from inside it."
          actionLabel="Open a Workspace"
          onAction={() => navDirect({ view: "workspaces" })}
          icon={
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(52,211,153,0.10)", border: "1px solid rgba(52,211,153,0.22)" }}
            >
              <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          }
        />
      ) : workspaceId && (
        <>
          <div className="flex gap-2 flex-wrap">
            {(["all", "active", "paused", "completed", "abandoned"] as Filter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors capitalize
                  ${filter === f ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30" : "text-gray-500 hover:text-white hover:bg-white/[0.05] border border-transparent"}`}>
                {f} <span className="ml-1 text-xs opacity-70">({counts[f]})</span>
              </button>
            ))}
          </div>

          {loading ? (
            <SkeletonGrid cols={3} count={6} height="h-36" />
          ) : filtered.length === 0 ? (
            <PageEmptyState
              title={filter === "all" ? "No sessions yet" : `No ${filter} sessions`}
              description="Open a workspace and start a session from the Sessions tab."
              actionLabel="Open a Workspace"
              onAction={() => navDirect({ view: "workspaces" })}
              icon={
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(52,211,153,0.10)", border: "1px solid rgba(52,211,153,0.22)" }}
                >
                  <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(s => (
                <SessionCard
                  key={s.id}
                  session={s}
                  workspaceTitle={workspaceId === ALL_WORKSPACES ? s.workspaceTitle : undefined}
                  onEdit={() => openEdit(s)}
                  onDelete={() => setDeleteTarget(s)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {editTarget && (
        <Modal title="Edit Session" onClose={() => setEditTarget(null)}>
          <form onSubmit={handleEdit} className="flex flex-col gap-4">
            {editErr && <p className="text-red-400 text-sm">{editErr}</p>}
            <Field label="Title">
              <input className={inputCls} value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} placeholder="Untitled Session" />
            </Field>
            <Field label="Status">
              <select className={inputCls} value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value as SessionStatus }))}>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="abandoned">Abandoned</option>
              </select>
            </Field>
            <Field label="Notes">
              <textarea className={inputCls + " resize-none"} rows={3} value={editForm.notes_text} onChange={e => setEditForm(p => ({ ...p, notes_text: e.target.value }))} placeholder="Session notes..." />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Mood (1-5)">
                <input type="number" min="1" max="5" className={inputCls} value={editForm.mood_rating} onChange={e => setEditForm(p => ({ ...p, mood_rating: e.target.value }))} placeholder="-" />
              </Field>
              <Field label="Productivity (1-5)">
                <input type="number" min="1" max="5" className={inputCls} value={editForm.productivity_rating} onChange={e => setEditForm(p => ({ ...p, productivity_rating: e.target.value }))} placeholder="-" />
              </Field>
            </div>
            <div className="flex gap-3 mt-2">
              <button type="button" onClick={() => setEditTarget(null)}
                className="flex-1 py-3 rounded-xl border border-white/15 text-gray-400 hover:text-white font-semibold text-sm transition-colors">Cancel</button>
              <button type="submit" disabled={editSaving}
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors disabled:opacity-50">
                {editSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Delete Session" onClose={() => setDeleteTarget(null)}>
          <p className="text-gray-400 text-sm mb-6">
            Delete session <span className="text-white font-semibold">"{deleteTarget.title ?? "Untitled"}"</span>? This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteTarget(null)}
              className="flex-1 py-3 rounded-xl border border-white/15 text-gray-400 hover:text-white font-semibold text-sm transition-colors">Cancel</button>
            <button onClick={handleDelete} disabled={deleting}
              className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors disabled:opacity-50">
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
