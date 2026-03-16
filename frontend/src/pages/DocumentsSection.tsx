import { useState, useEffect, useRef } from "react";
import {
  getDocuments, createDocument, updateDocument, deleteDocument,
  type Document, type ProcessingStatus,
} from "../api/documents";
import type { Subject } from "../api/subjects";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const statusStyles: Record<ProcessingStatus, { bg: string; text: string; label: string; dot: string }> = {
  pending:    { bg: "bg-gray-500/15",    text: "text-gray-400",    label: "Pending",    dot: "bg-gray-500"    },
  processing: { bg: "bg-amber-500/15",   text: "text-amber-400",   label: "Processing", dot: "bg-amber-400"   },
  completed:  { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "Processed",  dot: "bg-emerald-400" },
  failed:     { bg: "bg-red-500/15",     text: "text-red-400",     label: "Failed",     dot: "bg-red-400"     },
};

function fileIcon(type: string) {
  if (type.includes("pdf")) return { icon: "PDF", color: "bg-red-500/15 text-red-400 border-red-400/20" };
  if (type.includes("word") || type.includes("doc")) return { icon: "DOC", color: "bg-blue-500/15 text-blue-400 border-blue-400/20" };
  if (type.includes("text") || type.includes("txt")) return { icon: "TXT", color: "bg-gray-500/15 text-gray-400 border-gray-400/20" };
  if (type.includes("sheet") || type.includes("csv") || type.includes("excel")) return { icon: "XLS", color: "bg-emerald-500/15 text-emerald-400 border-emerald-400/20" };
  return { icon: "FILE", color: "bg-slate-500/15 text-slate-400 border-slate-400/20" };
}

// ── Shared inputs ─────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-400">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl bg-white/[0.08] border border-white/15 px-4 py-3 text-white " +
  "placeholder:text-gray-600 outline-none text-sm " +
  "focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition [&>option]:bg-slate-800";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Document Card ─────────────────────────────────────────────────────────────

function DocumentCard({ doc, subjectName, onDelete }: {
  doc: Document;
  subjectName?: string;
  onDelete: (d: Document) => void;
}) {
  const st = statusStyles[doc.processing_status];
  const fi = fileIcon(doc.file_type);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="group bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 flex flex-col gap-4
                    hover:bg-white/[0.06] hover:border-cyan-500/20 transition-all duration-200">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 text-[10px] font-black ${fi.color}`}>
          {fi.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm leading-snug truncate">{doc.title}</p>
              <p className="text-gray-600 text-xs mt-0.5 truncate">{doc.file_name}</p>
            </div>
            <button onClick={() => onDelete(doc)}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
              {doc.processing_status === "processing" && (
                <span className={`w-1.5 h-1.5 rounded-full ${st.dot} animate-pulse`} />
              )}
              {st.label}
            </span>
            {subjectName && (
              <span className="text-[10px] bg-indigo-500/15 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-400/20">
                {subjectName}
              </span>
            )}
            {doc.document_tags.map(dt => (
              <span key={dt.tag_id} className="text-[10px] bg-white/[0.06] text-gray-400 px-2 py-0.5 rounded-full">
                {dt.tag.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {doc.summary && (
        <div>
          <p className={`text-xs text-gray-400 leading-relaxed ${!expanded ? "line-clamp-2" : ""}`}>{doc.summary}</p>
          {doc.summary.length > 120 && (
            <button onClick={() => setExpanded(e => !e)} className="text-[10px] text-indigo-400 hover:text-indigo-300 mt-1 transition-colors">
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      )}

      {doc.topics && (
        <div className="flex flex-wrap gap-1">
          {doc.topics.split(",").slice(0, 5).map(t => (
            <span key={t} className="text-[10px] bg-white/[0.04] border border-white/[0.08] text-gray-500 px-2 py-0.5 rounded-lg">
              {t.trim()}
            </span>
          ))}
        </div>
      )}

      <div className="flex justify-between text-xs text-gray-600 pt-2 border-t border-white/[0.05] mt-auto">
        <span>{fmtSize(doc.file_size_bytes)}</span>
        <span>{fmtDate(doc.uploaded_at)}</span>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface Props { subjects: Subject[]; subjectFilter?: string }

type Filter = "all" | ProcessingStatus;

export default function DocumentsSection({ subjects, subjectFilter = "" }: Props) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  // Create (register document record)
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", file_name: "", file_type: "application/pdf", file_size_bytes: "", study_subject_id: "" });
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { load(); }, []);
  useEffect(() => { if (showCreate) setTimeout(() => titleRef.current?.focus(), 50); }, [showCreate]);

  async function load() {
    setLoading(true);
    try { setDocs(await getDocuments()); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to load documents"); }
    finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.file_name.trim()) return;
    setSaving(true); setFormErr(null);
    try {
      const d = await createDocument({
        title: form.title.trim(),
        file_name: form.file_name.trim(),
        file_path: `/uploads/${form.file_name.trim()}`,
        file_type: form.file_type,
        file_size_bytes: Number(form.file_size_bytes) || 0,
        study_subject_id: form.study_subject_id || null,
      });
      setDocs(prev => [d, ...prev]);
      setShowCreate(false);
      setForm({ title: "", file_name: "", file_type: "application/pdf", file_size_bytes: "", study_subject_id: "" });
    } catch (e) { setFormErr(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDocument(deleteTarget.id);
      setDocs(prev => prev.filter(d => d.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); setDeleteTarget(null); }
    finally { setDeleting(false); }
  }

  const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s.name]));
  const bySubject = subjectFilter ? docs.filter(d => d.study_subject_id === subjectFilter) : docs;
  const filtered = filter === "all" ? bySubject : bySubject.filter(d => d.processing_status === filter);
  const counts: Record<Filter, number> = {
    all: bySubject.length,
    pending: bySubject.filter(d => d.processing_status === "pending").length,
    processing: bySubject.filter(d => d.processing_status === "processing").length,
    completed: bySubject.filter(d => d.processing_status === "completed").length,
    failed: bySubject.filter(d => d.processing_status === "failed").length,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Documents</h1>
          <p className="text-gray-500 text-sm mt-1">{bySubject.length} document{bySubject.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
          Add Document
        </button>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-500/10 border border-red-400/20 px-5 py-4 text-sm text-red-300 flex items-center justify-between">
          {error}<button onClick={() => setError(null)} className="text-red-400 hover:text-red-200 ml-4">✕</button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "completed", "processing", "pending", "failed"] as Filter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors capitalize
              ${filter === f ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30" : "text-gray-500 hover:text-white hover:bg-white/[0.05] border border-transparent"}`}>
            {f} <span className="ml-1 text-xs opacity-70">({counts[f]})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-44 bg-white/[0.04] rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-6 py-32 text-center">
          <div className="w-20 h-20 rounded-2xl bg-cyan-500/10 border border-cyan-400/15 flex items-center justify-center">
            <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-xl">{filter === "all" ? "No documents yet" : `No ${filter} documents`}</p>
            <p className="text-gray-500 text-sm mt-1">{subjectFilter ? "No documents for this subject yet" : "Upload documents and let AI process them into study material"}</p>
          </div>
          {filter === "all" && (
            <button onClick={() => setShowCreate(true)}
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-2xl font-bold transition-colors">
              Add First Document
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(d => (
            <DocumentCard key={d.id} doc={d} subjectName={d.study_subject_id ? subjectMap[d.study_subject_id] : undefined} onDelete={setDeleteTarget} />
          ))}
        </div>
      )}

      {showCreate && (
        <Modal title="Add Document" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            {formErr && <p className="text-red-400 text-sm">{formErr}</p>}
            <Field label="Title *">
              <input ref={titleRef} className={inputCls} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Chapter 3 – Algorithms" required />
            </Field>
            <Field label="File Name *">
              <input className={inputCls} value={form.file_name} onChange={e => setForm(p => ({ ...p, file_name: e.target.value }))} placeholder="chapter3.pdf" required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="File Type">
                <select className={inputCls} value={form.file_type} onChange={e => setForm(p => ({ ...p, file_type: e.target.value }))}>
                  <option value="application/pdf">PDF</option>
                  <option value="application/msword">Word</option>
                  <option value="text/plain">Plain Text</option>
                  <option value="text/csv">CSV</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Size (bytes)">
                <input type="number" className={inputCls} value={form.file_size_bytes} onChange={e => setForm(p => ({ ...p, file_size_bytes: e.target.value }))} placeholder="0" />
              </Field>
            </div>
            <Field label="Subject">
              <select className={inputCls} value={form.study_subject_id} onChange={e => setForm(p => ({ ...p, study_subject_id: e.target.value }))}>
                <option value="">— None —</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <div className="flex gap-3 mt-2">
              <button type="button" onClick={() => setShowCreate(false)}
                className="flex-1 py-3 rounded-xl border border-white/15 text-gray-400 hover:text-white font-semibold text-sm transition-colors">Cancel</button>
              <button type="submit" disabled={saving}
                className="flex-1 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm transition-colors disabled:opacity-50">
                {saving ? "Adding…" : "Add Document"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Delete Document" onClose={() => setDeleteTarget(null)}>
          <p className="text-gray-400 text-sm mb-6">
            Delete <span className="text-white font-semibold">"{deleteTarget.title}"</span>? This cannot be undone.
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
