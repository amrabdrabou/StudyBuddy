import { useEffect, useState, useRef } from "react";
import {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  type Subject,
} from "../api/subjects";

interface Props {
  onSignOut: () => void;
  onGoToHome: () => void;
}

// ── Modal ──────────────────────────────────────────────────────────────────
interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
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

// ── Subject Card ───────────────────────────────────────────────────────────
interface CardProps {
  subject: Subject;
  onRename: (subject: Subject) => void;
  onDelete: (subject: Subject) => void;
}

function SubjectCard({ subject, onRename, onDelete }: CardProps) {
  return (
    <div className="group bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-4
                    hover:bg-white/10 hover:border-indigo-500/40 transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/20
                        flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onRename(subject)}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Rename"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(subject)}
            className="p-2 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      <p className="text-white font-semibold text-lg leading-snug">{subject.name}</p>
      <p className="text-xs text-gray-600 mt-auto">
        {new Date(subject.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </p>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function SubjectsPage({ onSignOut, onGoToHome }: Props) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Rename modal
  const [renameSubject, setRenameSubject] = useState<Subject | null>(null);
  const [renameName, setRenameName] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  // Delete confirmation
  const [deleteSubject_, setDeleteSubject] = useState<Subject | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const createInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Focus inputs when modals open
  useEffect(() => { if (showCreate) setTimeout(() => createInputRef.current?.focus(), 50); }, [showCreate]);
  useEffect(() => { if (renameSubject) setTimeout(() => renameInputRef.current?.focus(), 50); }, [renameSubject]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setSubjects(await getSubjects());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load subjects");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createName.trim()) return;
    setCreateLoading(true);
    setCreateError(null);
    try {
      const subject = await createSubject(createName.trim());
      setSubjects((prev) => [subject, ...prev]);
      setCreateName("");
      setShowCreate(false);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to create subject");
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!renameSubject || !renameName.trim()) return;
    setRenameLoading(true);
    setRenameError(null);
    try {
      const updated = await updateSubject(renameSubject.id, renameName.trim());
      setSubjects((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setRenameSubject(null);
    } catch (e) {
      setRenameError(e instanceof Error ? e.message : "Failed to rename subject");
    } finally {
      setRenameLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteSubject_) return;
    setDeleteLoading(true);
    try {
      await deleteSubject(deleteSubject_.id);
      setSubjects((prev) => prev.filter((s) => s.id !== deleteSubject_.id));
      setDeleteSubject(null);
    } catch (e) {
      // keep modal open, surface error
      setError(e instanceof Error ? e.message : "Failed to delete subject");
      setDeleteSubject(null);
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans antialiased flex flex-col">

      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={onGoToHome} className="text-white font-extrabold text-xl tracking-tighter cursor-pointer select-none">
            Study<span className="text-indigo-400">Buddy</span>
          </button>
          <button
            onClick={onSignOut}
            className="bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-xl text-sm font-semibold border border-white/20 transition-all"
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 pt-12 pb-8 w-full flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-extrabold tracking-tighter text-white">My Subjects</h1>
          <p className="text-gray-400">
            {loading ? "Loading…" : `${subjects.length} subject${subjects.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={() => { setCreateName(""); setCreateError(null); setShowCreate(true); }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold
                     text-sm transition-colors flex items-center gap-2 shadow-lg"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          New Subject
        </button>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 pb-16 w-full flex-1">

        {/* Error banner */}
        {error && (
          <div className="mb-6 rounded-2xl bg-red-500/10 border border-red-400/20 px-5 py-4 text-sm text-red-300 flex items-center justify-between">
            {error}
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200 ml-4">✕</button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 h-36 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && subjects.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center gap-6 py-32 text-center">
            <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <p className="text-white font-bold text-xl">No subjects yet</p>
              <p className="text-gray-500 text-sm mt-1">Create your first subject to get started</p>
            </div>
            <button
              onClick={() => { setCreateName(""); setCreateError(null); setShowCreate(true); }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-bold transition-colors"
            >
              Create Subject
            </button>
          </div>
        )}

        {/* Grid */}
        {!loading && subjects.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {subjects.map((s) => (
              <SubjectCard
                key={s.id}
                subject={s}
                onRename={(sub) => { setRenameSubject(sub); setRenameName(sub.name); setRenameError(null); }}
                onDelete={(sub) => setDeleteSubject(sub)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Create Modal ── */}
      {showCreate && (
        <Modal title="New Subject" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-300">Subject name</label>
              <input
                ref={createInputRef}
                type="text"
                required
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. Calculus, History, Python…"
                className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-white
                           placeholder:text-gray-600 outline-none text-sm
                           focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
              />
            </div>
            {createError && (
              <p className="text-sm text-red-400">{createError}</p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="flex-1 py-3 rounded-xl border border-white/20 text-gray-400 hover:text-white
                           hover:border-white/40 font-semibold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createLoading || !createName.trim()}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold
                           text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createLoading ? "Creating…" : "Create"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Rename Modal ── */}
      {renameSubject && (
        <Modal title="Rename Subject" onClose={() => setRenameSubject(null)}>
          <form onSubmit={handleRename} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-300">New name</label>
              <input
                ref={renameInputRef}
                type="text"
                required
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-white
                           placeholder:text-gray-600 outline-none text-sm
                           focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
              />
            </div>
            {renameError && (
              <p className="text-sm text-red-400">{renameError}</p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRenameSubject(null)}
                className="flex-1 py-3 rounded-xl border border-white/20 text-gray-400 hover:text-white
                           hover:border-white/40 font-semibold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={renameLoading || !renameName.trim()}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold
                           text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {renameLoading ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Delete Confirmation ── */}
      {deleteSubject_ && (
        <Modal title="Delete Subject" onClose={() => setDeleteSubject(null)}>
          <div className="flex flex-col gap-6">
            <p className="text-gray-300 text-sm leading-relaxed">
              Are you sure you want to delete{" "}
              <span className="text-white font-semibold">"{deleteSubject_.name}"</span>?
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteSubject(null)}
                className="flex-1 py-3 rounded-xl border border-white/20 text-gray-400 hover:text-white
                           hover:border-white/40 font-semibold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold
                           text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteLoading ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
