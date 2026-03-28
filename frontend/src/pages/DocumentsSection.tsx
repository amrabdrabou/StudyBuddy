import { useState, useEffect, useRef } from "react";
import { getDocuments, uploadDocument, deleteDocument, type Document, type DocumentStatus } from "../api/documents";
import { getWorkspaces, type Workspace } from "../api/workspaces";
import Modal from "../components/ui/Modal";
import ErrorBanner from "../components/ui/ErrorBanner";
import SkeletonGrid from "../components/ui/SkeletonGrid";
import DocumentCard from "../components/documents/DocumentCard";
import { fmtSize } from "../components/ui/utils";

// ── Main ──────────────────────────────────────────────────────────────────────

type Filter = "all" | DocumentStatus;

export default function DocumentsSection() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  useEffect(() => {
    if (workspaceId) loadDocs();
  }, [workspaceId]);

  // Poll every 3s while any doc is still processing
  useEffect(() => {
    const pending = docs.some(d => d.status === "uploaded" || d.status === "processing");
    if (!pending || !workspaceId) return;
    const id = setInterval(() => loadDocs(), 3000);
    return () => clearInterval(id);
  }, [docs, workspaceId]);

  async function loadWorkspaces() {
    setLoading(true);
    try {
      const ws = await getWorkspaces();
      setWorkspaces(ws);
      if (ws.length > 0) setWorkspaceId(ws[0].id);
      else setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load workspaces");
      setLoading(false);
    }
  }

  async function loadDocs() {
    if (!workspaceId) return;
    setLoading(true);
    try { setDocs(await getDocuments(workspaceId)); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to load documents"); }
    finally { setLoading(false); }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile || !workspaceId) return;
    setUploading(true); setUploadErr(null);
    try {
      const d = await uploadDocument(workspaceId, uploadFile);
      setDocs(prev => [d, ...prev]);
      setShowUpload(false);
      setUploadFile(null);
    } catch (e) { setUploadErr(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploading(false); }
  }

  async function handleDelete() {
    if (!deleteTarget || !workspaceId) return;
    setDeleting(true);
    try {
      await deleteDocument(workspaceId, deleteTarget.id);
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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Documents</h1>
          <p className="text-sm mt-1 text-gray-500">{docs.length} document{docs.length !== 1 ? "s" : ""} · upload and manage your study files</p>
        </div>
        {workspaceId && (
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-105 active:scale-95 flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#0891b2,#22d3ee)", boxShadow: "0 4px 20px rgba(6,182,212,0.3)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload Document
          </button>
        )}
      </div>

      {/* Scrollable workspace tabs */}
      {workspaces.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
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

      {workspaces.length === 0 && !loading && (
        <div className="flex flex-col items-center gap-4 py-32 text-center">
          <p className="text-white font-bold text-xl">No workspaces yet</p>
          <p className="text-gray-500 text-sm">Create a workspace first to upload documents.</p>
        </div>
      )}

      {workspaceId && (
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

          {loading ? (
            <SkeletonGrid cols={3} count={6} height="h-36" />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-6 py-32 text-center">
              <div className="w-20 h-20 rounded-2xl bg-cyan-500/10 border border-cyan-400/15 flex items-center justify-center">
                <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-bold text-xl">{filter === "all" ? "No documents yet" : `No ${filter} documents`}</p>
                <p className="text-gray-500 text-sm mt-1">Upload files to this workspace.</p>
              </div>
              {filter === "all" && (
                <button onClick={() => setShowUpload(true)}
                  className="px-6 py-3 rounded-2xl font-bold text-white transition-colors"
                  style={{ background: "#0891b2" }}>
                  Upload First Document
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(d => (
                <DocumentCard key={d.id} doc={d} onDelete={setDeleteTarget} />
              ))}
            </div>
          )}
        </>
      )}


      {showUpload && (
        <Modal title="Upload Document" onClose={() => { setShowUpload(false); setUploadFile(null); setUploadErr(null); }}>
          <form onSubmit={handleUpload} className="flex flex-col gap-4">
            {uploadErr && <p className="text-red-400 text-sm">{uploadErr}</p>}
            <div
              className="border-2 border-dashed border-white/20 rounded-2xl p-8 text-center cursor-pointer hover:border-cyan-500/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setUploadFile(f); }}
            >
              <input ref={fileInputRef} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setUploadFile(f); }} />
              {uploadFile ? (
                <div>
                  <p className="text-white font-semibold">{uploadFile.name}</p>
                  <p className="text-gray-500 text-sm mt-1">{fmtSize(uploadFile.size)}</p>
                </div>
              ) : (
                <div>
                  <svg className="w-10 h-10 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-gray-400 text-sm">Click or drag a file here</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-2">
              <button type="button" onClick={() => { setShowUpload(false); setUploadFile(null); setUploadErr(null); }}
                className="flex-1 py-3 rounded-xl border border-white/15 text-gray-400 hover:text-white font-semibold text-sm transition-colors">Cancel</button>
              <button type="submit" disabled={!uploadFile || uploading}
                className="flex-1 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm transition-colors disabled:opacity-50">
                {uploading ? "Uploading…" : "Upload"}
              </button>
            </div>
          </form>
        </Modal>
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
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
