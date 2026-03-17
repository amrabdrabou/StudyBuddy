import { useEffect, useState } from "react";
import { getWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace, type Workspace, type WorkspaceStatus } from "../api/workspaces";
import { getSubjects, type Subject } from "../api/subjects";
import { getSessions, createSession, updateSession, deleteSession, type Session } from "../api/sessions";
import { getDocuments, uploadDocument, deleteDocument, type Document } from "../api/documents";
import { getMicroGoals, createMicroGoal, updateMicroGoal, deleteMicroGoal, type MicroGoal } from "../api/micro_goals";
import { getDecks, createDeck, deleteDeck, type FlashcardDeck } from "../api/flashcards";
import { getQuizSets, createQuizSet, deleteQuizSet, type QuizSet } from "../api/quiz";
import { getNotes, createNote, deleteNote, type Note } from "../api/notes";
import Modal from "../components/ui/Modal";
import { fmtDate, fmtSize } from "../components/ui/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusColor(status: string) {
  switch (status) {
    case "active":     return "text-emerald-400 bg-emerald-400/10";
    case "paused":     return "text-amber-400 bg-amber-400/10";
    case "completed":  return "text-blue-400 bg-blue-400/10";
    case "canceled":   return "text-red-400 bg-red-400/10";
    case "abandoned":  return "text-red-400 bg-red-400/10";
    case "uploaded":   return "text-slate-400 bg-slate-400/10";
    case "processing": return "text-amber-400 bg-amber-400/10";
    case "ready":      return "text-emerald-400 bg-emerald-400/10";
    case "failed":     return "text-red-400 bg-red-400/10";
    default:           return "text-slate-400 bg-slate-400/10";
  }
}

// ── Tab types ─────────────────────────────────────────────────────────────────

type WorkspaceTab = "micro-goals" | "sessions" | "documents" | "flashcards" | "quizzes" | "notes";

const tabs: { id: WorkspaceTab; label: string }[] = [
  { id: "micro-goals", label: "Micro Goals" },
  { id: "sessions",    label: "Sessions" },
  { id: "documents",   label: "Documents" },
  { id: "flashcards",  label: "Flashcards" },
  { id: "quizzes",     label: "Quizzes" },
  { id: "notes",       label: "Notes" },
];

// ── Workspace Detail ──────────────────────────────────────────────────────────

function WorkspaceDetail({
  workspace,
  subject,
  onBack,
  onDeleted,
}: {
  workspace: Workspace;
  subject: Subject | undefined;
  onBack: () => void;
  onDeleted: () => void;
}) {
  const [tab, setTab] = useState<WorkspaceTab>("micro-goals");
  const [error, setError] = useState("");

  // Status update
  const handleStatusChange = async (status: WorkspaceStatus) => {
    try {
      await updateWorkspace(workspace.id, { status });
      onBack(); // refresh list
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete workspace "${workspace.title}"? This removes all its content.`)) return;
    try {
      await deleteWorkspace(workspace.id);
      onDeleted();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={onBack} className="mt-1 text-gray-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold text-white">{workspace.title}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(workspace.status)}`}>
              {workspace.status}
            </span>
          </div>
          {subject && <p className="text-sm text-gray-400 mt-0.5">{subject.name}</p>}
        </div>
        <div className="flex gap-2 flex-wrap">
          {workspace.status !== "completed" && (
            <button onClick={() => handleStatusChange("completed")}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors">
              Complete
            </button>
          )}
          {workspace.status === "active" && (
            <button onClick={() => handleStatusChange("paused")}
              className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors">
              Pause
            </button>
          )}
          {workspace.status === "paused" && (
            <button onClick={() => handleStatusChange("active")}
              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
              Resume
            </button>
          )}
          <button onClick={handleDelete}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
            Delete
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 text-sm py-2 px-3 rounded-lg font-medium transition-all ${
              tab === t.id ? "bg-violet-500 text-white" : "text-gray-400 hover:text-white"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "micro-goals" && <MicroGoalsTab workspaceId={workspace.id} />}
      {tab === "sessions"    && <SessionsTab workspaceId={workspace.id} />}
      {tab === "documents"   && <DocumentsTab workspaceId={workspace.id} />}
      {tab === "flashcards"  && <FlashcardsTab workspaceId={workspace.id} />}
      {tab === "quizzes"     && <QuizzesTab workspaceId={workspace.id} />}
      {tab === "notes"       && <NotesTab workspaceId={workspace.id} subjectId={workspace.subject_id} />}
    </div>
  );
}

// ── Micro Goals Tab ───────────────────────────────────────────────────────────

function MicroGoalsTab({ workspaceId }: { workspaceId: string }) {
  const [goals, setGoals] = useState<MicroGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try { setGoals(await getMicroGoals(workspaceId)); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to load"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [workspaceId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await createMicroGoal(workspaceId, { title: title.trim() });
      setTitle(""); setShowCreate(false); await load();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  };

  const handleStatus = async (goal: MicroGoal, status: MicroGoal["status"]) => {
    try { await updateMicroGoal(workspaceId, goal.id, { status }); await load(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteMicroGoal(workspaceId, id); await load(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
  };

  const statusIcon: Record<string, string> = {
    suggested: "○", pending: "○", in_progress: "◑", completed: "●", skipped: "✕",
  };

  if (loading) return <div className="text-gray-500 text-sm">Loading...</div>;

  return (
    <div className="space-y-4">
      {error && <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-sm">{error}</div>}
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-400">{goals.length} task{goals.length !== 1 ? "s" : ""}</span>
        <button onClick={() => setShowCreate(true)}
          className="text-sm px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-colors">
          + Add Task
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No tasks yet. Add your first micro-goal.</div>
      ) : (
        <div className="space-y-2">
          {goals.map(g => (
            <div key={g.id} className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/5">
              <span className={`text-lg ${g.status === "completed" ? "text-emerald-400" : g.status === "in_progress" ? "text-amber-400" : "text-gray-500"}`}>
                {statusIcon[g.status] ?? "○"}
              </span>
              <div className="flex-1">
                <p className={`text-sm font-medium ${g.status === "completed" ? "line-through text-gray-500" : "text-white"}`}>{g.title}</p>
                {g.deadline && <p className="text-xs text-gray-500 mt-0.5">Due {fmtDate(g.deadline)}</p>}
              </div>
              <div className="flex gap-1">
                {g.status === "pending" && (
                  <button onClick={() => handleStatus(g, "in_progress")}
                    className="text-xs px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors">
                    Start
                  </button>
                )}
                {g.status === "in_progress" && (
                  <button onClick={() => handleStatus(g, "completed")}
                    className="text-xs px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                    Done
                  </button>
                )}
                <button onClick={() => handleDelete(g.id)}
                  className="text-xs px-2 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <Modal title="Add Task" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Task title" required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500" />
            <button type="submit" disabled={saving}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors disabled:opacity-50">
              {saving ? "Adding..." : "Add Task"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── Sessions Tab ──────────────────────────────────────────────────────────────

function SessionsTab({ workspaceId }: { workspaceId: string }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try { setSessions(await getSessions(workspaceId)); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [workspaceId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createSession(workspaceId, {
        title: title.trim() || undefined,
        planned_duration_minutes: duration ? parseInt(duration) : undefined,
      });
      setTitle(""); setDuration(""); setShowCreate(false); await load();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  };

  const handleEnd = async (s: Session) => {
    try {
      await updateSession(workspaceId, s.id, {
        status: "completed",
        ended_at: new Date().toISOString(),
      });
      await load();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
  };

  const handleDelete = async (s: Session) => {
    try { await deleteSession(workspaceId, s.id); await load(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
  };

  if (loading) return <div className="text-gray-500 text-sm">Loading...</div>;

  return (
    <div className="space-y-4">
      {error && <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-sm">{error}</div>}
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-400">{sessions.length} session{sessions.length !== 1 ? "s" : ""}</span>
        <button onClick={() => setShowCreate(true)}
          className="text-sm px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-colors">
          + Start Session
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No sessions yet.</div>
      ) : (
        <div className="space-y-3">
          {sessions.map(s => (
            <div key={s.id} className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{s.title ?? "Study Session"}</p>
                  <p className="text-xs text-gray-500">{fmtDate(s.started_at)}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(s.status)}`}>
                  {s.status}
                </span>
              </div>
              {s.planned_duration_minutes && (
                <p className="text-xs text-gray-500">Planned: {s.planned_duration_minutes} min</p>
              )}
              <div className="flex gap-2">
                {s.status === "active" && (
                  <button onClick={() => handleEnd(s)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors">
                    End Session
                  </button>
                )}
                <button onClick={() => handleDelete(s)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <Modal title="Start Session" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Session title (optional)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500" />
            <input type="number" value={duration} onChange={e => setDuration(e.target.value)}
              placeholder="Planned duration (minutes, optional)" min={1}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500" />
            <button type="submit" disabled={saving}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors disabled:opacity-50">
              {saving ? "Starting..." : "Start Session"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── Documents Tab ─────────────────────────────────────────────────────────────

function DocumentsTab({ workspaceId }: { workspaceId: string }) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    try { setDocs(await getDocuments(workspaceId)); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [workspaceId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError("");
    try { await uploadDocument(workspaceId, file); await load(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Upload failed"); }
    finally { setUploading(false); e.target.value = ""; }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Delete "${doc.original_filename}"?`)) return;
    try { await deleteDocument(workspaceId, doc.id); await load(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
  };

  if (loading) return <div className="text-gray-500 text-sm">Loading...</div>;

  return (
    <div className="space-y-4">
      {error && <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-sm">{error}</div>}
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-400">{docs.length} document{docs.length !== 1 ? "s" : ""}</span>
        <label className={`text-sm px-4 py-2 rounded-xl cursor-pointer transition-colors ${uploading ? "bg-violet-600/50 text-white/50" : "bg-violet-600 hover:bg-violet-500 text-white"}`}>
          {uploading ? "Uploading..." : "+ Upload"}
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading}
            accept=".pdf,.doc,.docx,.txt,.md,.pptx" />
        </label>
      </div>

      {docs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No documents. Upload a PDF, Word doc, or text file.</div>
      ) : (
        <div className="space-y-3">
          {docs.map(d => (
            <div key={d.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{d.original_filename}</p>
                <p className="text-xs text-gray-500">{fmtSize(d.file_size)} · {fmtDate(d.created_at)}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(d.status)}`}>
                {d.status}
              </span>
              <button onClick={() => handleDelete(d)}
                className="text-gray-500 hover:text-red-400 transition-colors p-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Flashcards Tab ────────────────────────────────────────────────────────────

function FlashcardsTab({ workspaceId }: { workspaceId: string }) {
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try { setDecks(await getDecks(workspaceId)); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [workspaceId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try { await createDeck(workspaceId, { title: title.trim() }); setTitle(""); setShowCreate(false); await load(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (deck: FlashcardDeck) => {
    if (!confirm(`Delete deck "${deck.title}"?`)) return;
    try { await deleteDeck(workspaceId, deck.id); await load(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
  };

  if (loading) return <div className="text-gray-500 text-sm">Loading...</div>;

  return (
    <div className="space-y-4">
      {error && <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-sm">{error}</div>}
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-400">{decks.length} deck{decks.length !== 1 ? "s" : ""}</span>
        <button onClick={() => setShowCreate(true)}
          className="text-sm px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-colors">
          + New Deck
        </button>
      </div>

      {decks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No flashcard decks yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {decks.map(d => (
            <div key={d.id} className="p-5 bg-white/5 rounded-xl border border-white/5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <span className="text-lg">{d.icon ?? "🃏"}</span>
                </div>
                <button onClick={() => handleDelete(d)} className="text-gray-600 hover:text-red-400 transition-colors p-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              <p className="text-sm font-semibold text-white">{d.title}</p>
              {d.description && <p className="text-xs text-gray-500">{d.description}</p>}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <Modal title="New Flashcard Deck" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Deck name" required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500" />
            <button type="submit" disabled={saving}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors disabled:opacity-50">
              {saving ? "Creating..." : "Create Deck"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── Quizzes Tab ───────────────────────────────────────────────────────────────

function QuizzesTab({ workspaceId }: { workspaceId: string }) {
  const [quizSets, setQuizSets] = useState<QuizSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try { setQuizSets(await getQuizSets(workspaceId)); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [workspaceId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try { await createQuizSet(workspaceId, { title: title.trim() }); setTitle(""); setShowCreate(false); await load(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (qs: QuizSet) => {
    if (!confirm(`Delete quiz "${qs.title}"?`)) return;
    try { await deleteQuizSet(workspaceId, qs.id); await load(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
  };

  if (loading) return <div className="text-gray-500 text-sm">Loading...</div>;

  return (
    <div className="space-y-4">
      {error && <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-sm">{error}</div>}
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-400">{quizSets.length} quiz set{quizSets.length !== 1 ? "s" : ""}</span>
        <button onClick={() => setShowCreate(true)}
          className="text-sm px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-colors">
          + New Quiz
        </button>
      </div>

      {quizSets.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No quiz sets yet.</div>
      ) : (
        <div className="space-y-3">
          {quizSets.map(qs => (
            <div key={qs.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{qs.title}</p>
                {qs.description && <p className="text-xs text-gray-500 truncate">{qs.description}</p>}
                {qs.time_limit_minutes && <p className="text-xs text-gray-500">{qs.time_limit_minutes} min limit</p>}
              </div>
              <button onClick={() => handleDelete(qs)} className="text-gray-500 hover:text-red-400 transition-colors p-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <Modal title="New Quiz Set" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Quiz title" required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500" />
            <button type="submit" disabled={saving}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors disabled:opacity-50">
              {saving ? "Creating..." : "Create Quiz"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── Notes Tab ─────────────────────────────────────────────────────────────────

function NotesTab({ workspaceId, subjectId }: { workspaceId: string; subjectId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try { setNotes(await getNotes({ workspace_id: workspaceId })); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [workspaceId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    setSaving(true);
    try {
      await createNote({ subject_id: subjectId, workspace_id: workspaceId, title: noteTitle.trim() || undefined, content: noteContent.trim() });
      setNoteTitle(""); setNoteContent(""); setShowCreate(false); await load();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteNote(id); await load(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
  };

  if (loading) return <div className="text-gray-500 text-sm">Loading...</div>;

  return (
    <div className="space-y-4">
      {error && <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-sm">{error}</div>}
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-400">{notes.length} note{notes.length !== 1 ? "s" : ""}</span>
        <button onClick={() => setShowCreate(true)}
          className="text-sm px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-colors">
          + New Note
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No notes yet.</div>
      ) : (
        <div className="space-y-3">
          {notes.map(n => (
            <div key={n.id} className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  {n.title && <p className="text-sm font-semibold text-white">{n.title}</p>}
                  <p className="text-xs text-gray-400 mt-1 line-clamp-3">{n.content}</p>
                </div>
                <button onClick={() => handleDelete(n.id)} className="text-gray-600 hover:text-red-400 transition-colors p-1 flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-gray-600">{fmtDate(n.updated_at)}</p>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <Modal title="New Note" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <input autoFocus value={noteTitle} onChange={e => setNoteTitle(e.target.value)}
              placeholder="Title (optional)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500" />
            <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)}
              placeholder="Note content..." required rows={5}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none" />
            <button type="submit" disabled={saving}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors disabled:opacity-50">
              {saving ? "Saving..." : "Save Note"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── Main WorkspacesSection ────────────────────────────────────────────────────

export default function WorkspacesSection() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubjectId, setNewSubjectId] = useState("");
  const [saving, setSaving] = useState(false);
  const [openWorkspace, setOpenWorkspace] = useState<Workspace | null>(null);

  const load = async () => {
    try {
      const [ws, subs] = await Promise.all([getWorkspaces(), getSubjects()]);
      setWorkspaces(ws);
      setSubjects(subs);
      if (subs.length > 0 && !newSubjectId) setNewSubjectId(subs[0].id);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to load"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSubjectId) return;
    setSaving(true);
    try {
      await createWorkspace({ subject_id: newSubjectId, title: newTitle.trim() });
      setNewTitle(""); setShowCreate(false); await load();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  };

  const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s]));

  const filtered = workspaces.filter(w => {
    if (filterSubject !== "all" && w.subject_id !== filterSubject) return false;
    if (filterStatus !== "all" && w.status !== filterStatus) return false;
    return true;
  });

  if (openWorkspace) {
    return (
      <WorkspaceDetail
        workspace={openWorkspace}
        subject={subjectMap[openWorkspace.subject_id]}
        onBack={() => { setOpenWorkspace(null); load(); }}
        onDeleted={() => { setOpenWorkspace(null); load(); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Workspaces</h1>
          <p className="text-sm text-gray-400 mt-0.5">Your long-running study containers</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          disabled={subjects.length === 0}
          className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          + New Workspace
        </button>
      </div>

      {subjects.length === 0 && !loading && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
          Create a subject first before making workspaces.
        </div>
      )}

      {error && <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-sm">{error}</div>}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-violet-500">
          <option value="all">All Subjects</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-violet-500">
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
          <option value="canceled">Canceled</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          {workspaces.length === 0 ? "No workspaces yet. Create one to get started." : "No workspaces match the current filters."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(w => (
            <button key={w.id} onClick={() => setOpenWorkspace(w)}
              className="text-left p-5 bg-white/5 hover:bg-white/8 border border-white/5 hover:border-violet-500/30 rounded-2xl transition-all group space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
                  <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(w.status)}`}>
                  {w.status}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white group-hover:text-violet-300 transition-colors">{w.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{subjectMap[w.subject_id]?.name ?? "Unknown subject"}</p>
              </div>
              <p className="text-xs text-gray-600">{fmtDate(w.updated_at)}</p>
            </button>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <Modal title="New Workspace" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Subject</label>
              <select value={newSubjectId} onChange={e => setNewSubjectId(e.target.value)} required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500">
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Title</label>
              <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g. Exam Prep — Finals" required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500" />
            </div>
            <button type="submit" disabled={saving}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors disabled:opacity-50">
              {saving ? "Creating..." : "Create Workspace"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
