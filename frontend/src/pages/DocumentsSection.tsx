import { useState, useEffect } from "react";
import { getDocuments, deleteDocument, type Document, type DocumentStatus } from "../api/documents";
import { getWorkspaces, type Workspace } from "../api/workspaces";
import Modal from "../components/ui/Modal";
import ErrorBanner from "../components/ui/ErrorBanner";
import PageEmptyState from "../components/ui/PageEmptyState";
import SkeletonGrid from "../components/ui/SkeletonGrid";
import DocumentCard from "../components/documents/DocumentCard";
import { useNavStore } from "../store/navStore";

const ALL_WORKSPACES = "all-workspaces";
type Filter = "all" | DocumentStatus;
type DocumentListItem = Document & { workspaceTitle: string };

export default function DocumentsSection() {
  const { navDirect } = useNavStore();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState(ALL_WORKSPACES);
  const [docs, setDocs] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [deleteTarget, setDeleteTarget] = useState<DocumentListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadWorkspaces(); }, []);
  useEffect(() => { if (workspaceId) loadDocs(); }, [workspaceId, workspaces]);

  useEffect(() => {
    const pending = docs.some((doc) => doc.status === "uploaded" || doc.status === "processing");
    if (!pending || !workspaceId) return;
    const id = setInterval(() => loadDocs(), 3000);
    return () => clearInterval(id);
  }, [docs, workspaceId, workspaces]);

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

  async function loadDocs() {
    if (!workspaceId) return;
    setLoading(true);
    try {
      if (workspaceId === ALL_WORKSPACES) {
        const grouped = await Promise.all(
          workspaces.map(async (workspace) => {
            const items = await getDocuments(workspace.id);
            return items.map((doc) => ({ ...doc, workspaceTitle: workspace.title }));
          }),
        );
        setDocs(grouped.flat().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      } else {
        const currentWorkspace = workspaces.find((workspace) => workspace.id === workspaceId);
        if (!currentWorkspace) {
          setDocs([]);
        } else {
          const items = await getDocuments(workspaceId);
          setDocs(items.map((doc) => ({ ...doc, workspaceTitle: currentWorkspace.title })));
        }
      }
    }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to load documents"); }
    finally { setLoading(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDocument(deleteTarget.workspace_id, deleteTarget.id);
      setDocs(prev => prev.filter(d => d.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to delete"); setDeleteTarget(null); }
    finally { setDeleting(false); }
  }

  const filtered = filter === "all" ? docs : docs.filter(d => d.status === filter);
  const counts: Record<Filter, number> = {
    all: docs.length,
    uploaded: docs.filter(d => d.status === "uploaded").length,
    processing: docs.filter(d => d.status === "processing").length,
    ready: docs.filter(d => d.status === "ready").length,
    failed: docs.filter(d => d.status === "failed").length,
  };

  return (
    <div className="flex flex-col gap-8 pb-24">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Documents</h1>
        <p className="text-sm mt-1 text-gray-500">
          {docs.length} document{docs.length !== 1 ? "s" : ""} · browse and manage your study files
        </p>
      </div>

      {workspaces.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setWorkspaceId(ALL_WORKSPACES)}
            className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
            style={workspaceId === ALL_WORKSPACES
              ? { background: "rgba(6,182,212,0.15)", color: "#22d3ee", border: "1px solid rgba(6,182,212,0.3)" }
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
                ? { background: "rgba(6,182,212,0.15)", color: "#22d3ee", border: "1px solid rgba(6,182,212,0.3)" }
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
          description="Create a workspace first, then upload documents to feed the AI pipeline."
          actionLabel="Open a Workspace"
          onAction={() => navDirect({ view: "workspaces" })}
          icon={
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(6,182,212,0.10)", border: "1px solid rgba(6,182,212,0.22)" }}
            >
              <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          }
        />
      ) : workspaceId && (
        <>
          <div className="flex gap-2 flex-wrap">
            {(["all", "ready", "processing", "uploaded", "failed"] as Filter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors capitalize
                  ${filter === f ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30" : "text-gray-500 hover:text-white hover:bg-white/[0.05] border border-transparent"}`}>
                {f} <span className="ml-1 text-xs opacity-70">({counts[f]})</span>
              </button>
            ))}
          </div>

          {!loading && docs.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Documents", value: docs.length, color: "text-cyan-400" },
                { label: "Ready", value: counts.ready, color: "text-emerald-400" },
                { label: "Processing", value: counts.processing, color: "text-amber-400" },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 text-center">
                  <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
                  <p className="text-gray-500 text-xs mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          {loading ? (
            <SkeletonGrid cols={3} count={6} height="h-36" />
          ) : filtered.length === 0 ? (
            <PageEmptyState
              title={filter === "all" ? "No documents yet" : `No ${filter} documents`}
              description="Open a workspace and upload documents from the Documents tab."
              actionLabel="Open a Workspace"
              onAction={() => navDirect({ view: "workspaces" })}
              icon={
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(6,182,212,0.10)", border: "1px solid rgba(6,182,212,0.22)" }}
                >
                  <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(d => (
                <DocumentCard
                  key={d.id}
                  doc={d}
                  workspaceTitle={workspaceId === ALL_WORKSPACES ? d.workspaceTitle : undefined}
                  onDelete={() => setDeleteTarget(d)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {deleteTarget && (
        <Modal title="Delete Document" onClose={() => setDeleteTarget(null)}>
          <p className="text-gray-400 text-sm mb-6">
            Delete <span className="text-white font-semibold">"{deleteTarget.original_filename}"</span>? This cannot be undone.
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
