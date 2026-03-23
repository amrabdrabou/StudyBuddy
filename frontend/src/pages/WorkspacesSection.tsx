import { useEffect, useState } from "react";
import { getWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace, type Workspace, type WorkspaceStatus } from "../api/workspaces";
import { getSubjects, type Subject } from "../api/subjects";
import { getDocuments, uploadDocument, deleteDocument, getDocumentContent, type Document, type DocumentContent } from "../api/documents";
import CanvasNoteEditor from "../components/canvas/CanvasNoteEditor";
import DocumentCanvasViewer from "../components/canvas/DocumentCanvasViewer";
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

type WorkspaceTab = "documents" | "summary" | "ai-chat" | "micro-goals" | "sessions" | "flashcards" | "quizzes" | "timeline";

const tabs: { id: WorkspaceTab; label: string }[] = [
  { id: "documents",   label: "Documents" },
  { id: "summary",     label: "Summary" },
  { id: "ai-chat",     label: "AI Chat" },
  { id: "micro-goals", label: "Road Map" },
  { id: "sessions",    label: "Sessions" },
  { id: "flashcards",  label: "Flashcards" },
  { id: "quizzes",     label: "Quizzes" },
  { id: "timeline",    label: "Timeline" },
];

// ── Workspace Detail ──────────────────────────────────────────────────────────

export function WorkspaceDetail({
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
  const [tab, setTab] = useState<WorkspaceTab>("documents");
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
      {tab === "documents"   && <DocumentsTab workspaceId={workspace.id} subjectId={workspace.subject_id} />}
      {tab === "summary"     && <SummaryTab workspaceId={workspace.id} />}
      {tab === "ai-chat"     && <AIChatTab workspaceId={workspace.id} workspaceTitle={workspace.title} />}
      {tab === "micro-goals" && <MicroGoalsTab workspaceId={workspace.id} />}
      {tab === "sessions"    && <SessionsTab workspaceId={workspace.id} />}
      {tab === "flashcards"  && <FlashcardsTab workspaceId={workspace.id} />}
      {tab === "quizzes"     && <QuizzesTab workspaceId={workspace.id} />}
      {tab === "timeline"    && <TimelineTab workspaceId={workspace.id} />}
    </div>
  );
}

// ── Summary Tab ───────────────────────────────────────────────────────────────

function SummaryTab({ workspaceId }: { workspaceId: string }) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocuments(workspaceId)
      .then(setDocs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (loading) return <div className="text-gray-500 text-sm">Loading…</div>;

  const readyDocs = docs.filter(d => d.status === "ready");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Document Summaries</h3>
          <p className="text-xs text-gray-500 mt-0.5">AI-generated summaries of your uploaded documents</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs font-semibold text-amber-400">Coming Soon</span>
        </div>
      </div>

      {docs.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">
          No documents uploaded yet. Upload a document to see its summary here.
        </div>
      ) : readyDocs.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">
          Documents are still being processed. Check back shortly.
        </div>
      ) : (
        <div className="space-y-3">
          {readyDocs.map(doc => (
            <div key={doc.id} className="rounded-xl border border-white/5 overflow-hidden">
              {/* Doc header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-white/5">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-white truncate flex-1">{doc.original_filename}</p>
                <span className="text-xs text-gray-600 flex-shrink-0">{fmtDate(doc.created_at)}</span>
              </div>

              {/* Summary body — placeholder */}
              <div className="px-4 py-3 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-3.5 h-3.5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span className="text-xs font-medium text-violet-400">AI Summary</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-400/10 text-amber-400">Coming Soon</span>
                </div>
                <div className="space-y-1.5">
                  <div className="h-2 rounded-full bg-white/5 w-full" />
                  <div className="h-2 rounded-full bg-white/5 w-5/6" />
                  <div className="h-2 rounded-full bg-white/5 w-4/6" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── AI Coming Soon placeholder (shared) ───────────────────────────────────────

function AiComingSoon({
  icon, title, description, bullets,
}: {
  icon: string;
  title: string;
  description: string;
  bullets: { emoji: string; text: string }[];
}) {
  return (
    <div className="flex flex-col items-center py-10 gap-6">
      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20">
        <svg className="w-3.5 h-3.5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <span className="text-xs font-semibold text-violet-400 tracking-wide">AI-POWERED · COMING SOON</span>
      </div>

      <div className="text-center max-w-sm">
        <div className="text-4xl mb-3">{icon}</div>
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <p className="text-sm text-gray-500 mt-2">{description}</p>
      </div>

      <div className="w-full max-w-xs space-y-2">
        {bullets.map((b, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5">
            <span className="text-base">{b.emoji}</span>
            <p className="text-sm text-gray-400">{b.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Micro Goals Tab ───────────────────────────────────────────────────────────

function MicroGoalsTab(_: { workspaceId: string }) {
  return (
    <AiComingSoon
      icon="🗺️"
      title="AI Roadmap Generator"
      description="Upload your documents and the AI will automatically generate a personalized study roadmap broken into clear, achievable micro-goals."
      bullets={[
        { emoji: "📄", text: "Analyzes your uploaded documents" },
        { emoji: "🧠", text: "Identifies key topics and concepts" },
        { emoji: "✅", text: "Creates ordered, trackable tasks" },
        { emoji: "📅", text: "Estimates time for each milestone" },
      ]}
    />
  );
}

// ── Sessions Tab ──────────────────────────────────────────────────────────────

function SessionsTab(_: { workspaceId: string }) {
  return (
    <AiComingSoon
      icon="⏱️"
      title="AI Study Scheduler"
      description="Tell the AI your deadline and availability — it will plan optimized study sessions around your micro-goals and track your progress automatically."
      bullets={[
        { emoji: "📆", text: "Schedules sessions around your calendar" },
        { emoji: "🎯", text: "Aligns each session to a micro-goal" },
        { emoji: "📊", text: "Tracks focus time and completion rate" },
        { emoji: "🔔", text: "Smart reminders and streak tracking" },
      ]}
    />
  );
}

// ── Documents Tab ─────────────────────────────────────────────────────────────

function DocumentsTab({ workspaceId, subjectId }: { workspaceId: string; subjectId: string }) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);       // doc id being opened
  const [docViewer, setDocViewer] = useState<{ doc: Document; content: DocumentContent } | null>(null);
  const [openNote, setOpenNote] = useState<Note | null>(null);
  const [creatingNote, setCreatingNote] = useState(false);

  const load = async () => {
    try {
      const [d, n] = await Promise.all([
        getDocuments(workspaceId),
        getNotes({ workspace_id: workspaceId }),
      ]);
      setDocs(d);
      setNotes(n.filter(n => n.canvas_enabled));
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
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

  const handleDeleteDoc = async (doc: Document) => {
    if (!confirm(`Delete "${doc.original_filename}"?`)) return;
    try { await deleteDocument(workspaceId, doc.id); await load(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
  };

  const handleDeleteNote = async (id: string) => {
    try { await deleteNote(id); await load(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
  };

  const handleOpenDoc = async (doc: Document) => {
    setOpening(doc.id);
    try {
      const content = await getDocumentContent(workspaceId, doc.id);
      setDocViewer({ doc, content });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load document content");
    } finally {
      setOpening(null);
    }
  };

  const handleNewNote = async () => {
    setCreatingNote(true);
    try {
      const note = await createNote({
        subject_id: subjectId,
        workspace_id: workspaceId,
        title: "",
        content: "",
        canvas_enabled: true,
      });
      await load();
      setOpenNote(note);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create note");
    } finally {
      setCreatingNote(false);
    }
  };

  if (loading) return <div className="text-gray-500 text-sm">Loading...</div>;

  // Full-screen overlays
  if (docViewer) {
    return (
      <DocumentCanvasViewer
        filename={docViewer.doc.original_filename}
        content={docViewer.content}
        onClose={() => setDocViewer(null)}
      />
    );
  }
  if (openNote) {
    return (
      <CanvasNoteEditor
        note={openNote}
        onClose={() => { setOpenNote(null); load(); }}
        onSaved={updated => setOpenNote(updated)}
      />
    );
  }

  return (
    <div className="space-y-8">
      {error && <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-sm">{error}</div>}

      {/* ── Documents section ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Documents</p>
          <label className={`text-sm px-3 py-1.5 rounded-xl cursor-pointer transition-colors ${uploading ? "bg-cyan-600/50 text-white/50" : "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400"}`}>
            {uploading ? "Uploading…" : "+ Upload"}
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading}
              accept=".pdf,.doc,.docx,.txt,.md,.pptx" />
          </label>
        </div>

        {docs.length === 0 ? (
          <label className={`flex flex-col items-center justify-center gap-3 p-10 rounded-2xl border-2 border-dashed cursor-pointer transition-colors ${uploading ? "border-cyan-500/50 bg-cyan-500/5" : "border-white/10 hover:border-cyan-500/40 hover:bg-white/[0.02]"}`}>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-white font-medium text-sm">{uploading ? "Uploading…" : "Upload a document"}</p>
              <p className="text-xs text-gray-600 mt-0.5">PDF, Word, PowerPoint, or plain text</p>
            </div>
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading}
              accept=".pdf,.doc,.docx,.txt,.md,.pptx" />
          </label>
        ) : (
          <div className="space-y-2">
            {docs.map(d => (
              <div key={d.id} className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4.5 h-4.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{d.original_filename}</p>
                    <p className="text-xs text-gray-500">{fmtSize(d.file_size)} · {fmtDate(d.created_at)}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusColor(d.status)}`}>
                    {d.status === "processing" ? "extracting…" : d.status}
                  </span>
                  <button onClick={() => handleDeleteDoc(d)} className="text-gray-600 hover:text-red-400 transition-colors p-1 flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {d.status === "ready" && (
                  <div className="pt-1 border-t border-white/5">
                    <button
                      onClick={() => handleOpenDoc(d)}
                      disabled={opening === d.id}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 disabled:opacity-50 transition-colors"
                    >
                      {opening === d.id ? (
                        <><span className="w-3 h-3 border border-cyan-400 border-t-transparent rounded-full animate-spin" />Loading…</>
                      ) : (
                        <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>Open in Canvas</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Canvas Notes section ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Canvas Notes</p>
          <button
            onClick={handleNewNote}
            disabled={creatingNote}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 transition-colors disabled:opacity-50"
          >
            {creatingNote ? (
              <><span className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin" />Creating…</>
            ) : (
              <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>New Note</>
            )}
          </button>
        </div>

        {notes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </div>
            <p className="text-sm text-gray-500">No canvas notes yet.</p>
            <p className="text-xs text-gray-600">Create a new note or open a document in canvas mode.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notes.map(n => (
              <div key={n.id}
                className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 hover:border-violet-500/20 cursor-pointer transition-colors group"
                onClick={() => setOpenNote(n)}
              >
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{n.title || "Untitled note"}</p>
                  <p className="text-xs text-gray-600">{fmtDate(n.updated_at)}</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleDeleteNote(n.id); }}
                  className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all p-1 flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Flashcards Tab ────────────────────────────────────────────────────────────

function FlashcardsTab(_: { workspaceId: string }) {
  return (
    <AiComingSoon
      icon="🃏"
      title="AI Flashcard Generator"
      description="The AI reads your documents and canvas notes to automatically generate spaced-repetition flashcard decks — no manual card creation needed."
      bullets={[
        { emoji: "📖", text: "Extracts key terms and definitions" },
        { emoji: "🔁", text: "Spaced repetition scheduling" },
        { emoji: "🌍", text: "Supports multiple languages" },
        { emoji: "📈", text: "Tracks retention and weak spots" },
      ]}
    />
  );
}

// ── Quizzes Tab ───────────────────────────────────────────────────────────────

function QuizzesTab(_: { workspaceId: string }) {
  return (
    <AiComingSoon
      icon="📝"
      title="AI Quiz Generator"
      description="Generate practice quizzes from your materials with multiple-choice, true/false, and short-answer questions — graded instantly by AI."
      bullets={[
        { emoji: "🎯", text: "Targets your weakest areas first" },
        { emoji: "✍️", text: "Multiple question formats" },
        { emoji: "⚡", text: "Instant AI grading and feedback" },
        { emoji: "🏆", text: "Score history and progress tracking" },
      ]}
    />
  );
}

// ── AI Chat Tab ───────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

function AIChatTab({ workspaceId, workspaceTitle }: { workspaceId: string; workspaceTitle: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = { current: null as HTMLDivElement | null };

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/workspaces/${workspaceId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.content }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply ?? data.message ?? "No response.",
        timestamp: new Date(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "AI Chat is coming soon. This feature will let you ask questions about your workspace materials, get study tips, and generate practice questions.",
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[60vh] rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">AI Study Assistant</p>
          <p className="text-xs text-gray-500">Ask anything about <span className="text-gray-400">{workspaceTitle}</span></p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-medium">Ask your AI tutor</p>
              <p className="text-sm text-gray-500 mt-1 max-w-xs">Summarize documents, explain concepts, generate practice questions, or get study tips for this workspace.</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {["Summarize my documents", "Create practice questions", "Explain key concepts"].map(s => (
                <button key={s} onClick={() => setInput(s)}
                  className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-violet-500/50 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
              msg.role === "user" ? "bg-violet-600 text-white" : "bg-white/10 text-gray-400"
            }`}>
              {msg.role === "user" ? "U" : "AI"}
            </div>
            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-violet-600 text-white rounded-tr-sm"
                : "bg-white/5 text-gray-200 rounded-tl-sm border border-white/5"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-400">AI</div>
            <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        <div ref={el => { bottomRef.current = el; }} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2 p-3 border-t border-white/10 flex-shrink-0">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask something…"
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
        />
        <button type="submit" disabled={!input.trim() || loading}
          className="w-10 h-10 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 flex items-center justify-center transition-colors">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>
    </div>
  );
}

// ── Timeline Tab ──────────────────────────────────────────────────────────────

function TimelineTab(_: { workspaceId: string }) {
  const steps = [
    { icon: "📄", label: "Upload documents", color: "text-cyan-400 bg-cyan-400/10" },
    { icon: "🤖", label: "AI extracts & summarizes", color: "text-violet-400 bg-violet-400/10" },
    { icon: "🗺️", label: "Build your roadmap (Micro Goals)", color: "text-blue-400 bg-blue-400/10" },
    { icon: "⏱️", label: "Log study sessions", color: "text-emerald-400 bg-emerald-400/10" },
    { icon: "🃏", label: "Review with Flashcards & Quizzes", color: "text-amber-400 bg-amber-400/10" },
    { icon: "✅", label: "Track progress on the Timeline", color: "text-pink-400 bg-pink-400/10" },
  ];

  return (
    <div className="flex flex-col items-center py-12 gap-8">
      {/* Badge */}
      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/20">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-xs font-semibold text-amber-400 tracking-wide">COMING SOON</span>
      </div>

      {/* Heading */}
      <div className="text-center max-w-md">
        <h3 className="text-xl font-bold text-white">Study Timeline</h3>
        <p className="text-sm text-gray-500 mt-2">
          A visual history of everything you do in this workspace — sessions, uploads, goals completed, and milestones reached — all on one scrollable timeline.
        </p>
      </div>

      {/* Preview steps */}
      <div className="w-full max-w-sm space-y-0">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base ${step.color}`}>
                {step.icon}
              </div>
              {i < steps.length - 1 && <div className="w-px h-6 bg-white/5" />}
            </div>
            <p className="text-sm text-gray-400 mt-2">{step.label}</p>
          </div>
        ))}
      </div>
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
