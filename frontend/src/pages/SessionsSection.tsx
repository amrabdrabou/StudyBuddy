import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import {
  getSessions, getSessionsBySubject, createSession, updateSession, deleteSession,
  type StudySession, type SessionStatus, type IntentionType,
} from "../api/sessions";
import { createNote, type Note } from "../api/notes";
import type { Subject } from "../api/subjects";

// ── Session Documents ─────────────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

type DocStatus = "pending" | "processing" | "completed" | "failed";

interface SessionDoc {
  id: string;
  title: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  processing_status: DocStatus;
  summary: string | null;
  uploaded_at: string;
}

const DOC_STATUS: Record<DocStatus, { bg: string; text: string; label: string; pulse: boolean }> = {
  pending:    { bg: "bg-gray-500/15",    text: "text-gray-400",    label: "Queued",     pulse: true  },
  processing: { bg: "bg-amber-500/15",   text: "text-amber-400",   label: "Processing", pulse: true  },
  completed:  { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "Ready",      pulse: false },
  failed:     { bg: "bg-red-500/15",     text: "text-red-400",     label: "Failed",     pulse: false },
};

function fmtFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function fileTypeLabel(mime: string) {
  if (mime.includes("pdf")) return "PDF";
  if (mime.includes("word") || mime.includes("doc")) return "DOCX";
  if (mime.includes("text") || mime.includes("txt")) return "TXT";
  return "FILE";
}

async function fetchSessionDocs(sessionId: string): Promise<SessionDoc[]> {
  const token = localStorage.getItem("access_token");
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}/documents`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return [];
  return res.json();
}

async function uploadDocumentToSession(sessionId: string, file: File, title?: string): Promise<SessionDoc> {
  const token = localStorage.getItem("access_token");
  const form = new FormData();
  form.append("file", file);
  if (title) form.append("title", title);
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}/documents/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Upload failed: ${res.status}`);
  }
  return res.json();
}

// ── Session Documents Panel ───────────────────────────────────────────────────
function SessionDocumentsPanel({ sessionId }: { sessionId: string }) {
  const [docs, setDocs] = useState<SessionDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadDocs();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [sessionId]);

  async function loadDocs() {
    const list = await fetchSessionDocs(sessionId);
    setDocs(list);
    schedulePoll(list);
  }

  function schedulePoll(list: SessionDoc[]) {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    const needsPoll = list.some(d => d.processing_status === "pending" || d.processing_status === "processing");
    if (!needsPoll) return;
    pollRef.current = setInterval(async () => {
      const updated = await fetchSessionDocs(sessionId);
      setDocs(updated);
      const stillActive = updated.some(d => d.processing_status === "pending" || d.processing_status === "processing");
      if (!stillActive && pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }, 3000);
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true); setUploadError(null);
    try {
      for (const file of Array.from(files)) {
        const doc = await uploadDocumentToSession(sessionId, file);
        setDocs(prev => { const next = [doc, ...prev]; schedulePoll(next); return next; });
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const hasPending = docs.some(d => d.processing_status === "pending" || d.processing_status === "processing");

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <svg className="w-3.5 h-3.5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Study Materials</span>
        {docs.length > 0 && (
          <span className="ml-auto text-xs text-gray-600">{docs.length} file{docs.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all
          ${dragOver ? "border-cyan-500/60 bg-cyan-500/10" : "border-white/10 hover:border-cyan-500/30 hover:bg-white/[0.02]"}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-cyan-400 py-1">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm font-semibold">Uploading…</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3 py-1">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <div className="text-left">
              <p className="text-sm text-gray-400">
                Drop files or <span className="text-cyan-400 font-semibold">browse</span>
              </p>
              <p className="text-xs text-gray-600">PDF, DOCX, TXT — max 20 MB</p>
            </div>
          </div>
        )}
      </div>

      {uploadError && (
        <div className="text-xs text-red-400 bg-red-500/10 rounded-xl px-4 py-2.5 border border-red-500/20 flex items-center justify-between">
          {uploadError}
          <button onClick={() => setUploadError(null)} className="ml-2 hover:text-red-200 flex-shrink-0">✕</button>
        </div>
      )}

      {docs.length > 0 && (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {docs.map(sd => {
            const st = DOC_STATUS[sd.processing_status];
            return (
              <div key={sd.id}
                className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2">
                <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                  <span className="text-[9px] font-black text-gray-400">{fileTypeLabel(sd.file_type)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{sd.title}</p>
                  <p className="text-gray-600 text-xs">{fmtFileSize(sd.file_size_bytes)}</p>
                </div>
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${st.bg} flex-shrink-0`}>
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0
                    ${st.pulse ? "animate-pulse" : ""}
                    ${sd.processing_status === "completed" ? "bg-emerald-400"
                      : sd.processing_status === "failed" ? "bg-red-400"
                      : sd.processing_status === "processing" ? "bg-amber-400"
                      : "bg-gray-400"}`} />
                  <span className={`text-[10px] font-bold ${st.text}`}>{st.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasPending && (
        <div className="flex items-center gap-2 text-xs text-amber-300/80 bg-amber-500/8 border border-amber-400/15 rounded-xl px-4 py-2.5">
          <svg className="w-3.5 h-3.5 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          AI is extracting content — flashcards &amp; quizzes will appear when ready
        </div>
      )}
    </div>
  );
}

// ── Session Notes Panel ───────────────────────────────────────────────────────
function SessionNotesPanel({ subjectId }: { subjectId?: string }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Note[]>([]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true); setError(null);
    try {
      const note = await createNote({
        title: title.trim(),
        content: content.trim() || undefined,
        study_subject_id: subjectId ?? null,
      });
      setSaved(prev => [note, ...prev].slice(0, 6));
      setTitle("");
      setContent("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save note");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Header */}
      <div className="flex items-center gap-2">
        <svg className="w-3.5 h-3.5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Quick Notes</span>
        {saved.length > 0 && (
          <span className="ml-auto text-xs text-gray-600">{saved.length} saved</span>
        )}
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-2">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Note title…"
          className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-sm text-white
                     placeholder:text-gray-600 outline-none focus:border-violet-500/50 focus:ring-1
                     focus:ring-violet-500/20 transition"
        />
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Write your notes here…"
          rows={4}
          className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-sm text-white
                     placeholder:text-gray-600 outline-none focus:border-violet-500/50 focus:ring-1
                     focus:ring-violet-500/20 transition resize-none"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="w-full py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300
                     border border-violet-500/20 text-sm font-semibold transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
          {saving ? "Saving…" : "Save Note"}
        </button>
      </form>

      {saved.length > 0 && (
        <div className="flex flex-col gap-1.5 overflow-y-auto max-h-36">
          {saved.map(n => (
            <div key={n.id}
              className="flex items-start gap-2 bg-white/[0.03] border border-violet-500/10 rounded-xl px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{n.title}</p>
                {n.content && (
                  <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{n.content}</p>
                )}
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold flex-shrink-0">✓</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── localStorage key ──────────────────────────────────────────────────────────
const LS_TIMER = "sb_active_timer";

interface TimerState {
  sessionId: string;
  subjectId: string | null;
  offsetSeconds: number;
  startMs: number | null; // null = paused
}

function getElapsed(t: TimerState): number {
  return t.offsetSeconds + (t.startMs ? Math.floor((Date.now() - t.startMs) / 1000) : 0);
}

function fmt(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmtDuration(minutes: number | null): string {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface SessionsSectionHandle {
  openCreate: () => void;
}

interface Props { subjects: Subject[]; subjectId?: string; }
type Filter = "all" | "pending" | "active" | "completed" | "abandoned";

const statusStyles: Record<SessionStatus, { bg: string; text: string; label: string }> = {
  pending:   { bg: "bg-gray-500/15",    text: "text-gray-400",    label: "Pending"   },
  active:    { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "Active"    },
  completed: { bg: "bg-indigo-500/15",  text: "text-indigo-400",  label: "Completed" },
  abandoned: { bg: "bg-red-500/15",     text: "text-red-400",     label: "Abandoned" },
};

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

// ── Workspace Notes Editor (center panel) ────────────────────────────────────
function WorkspaceNotesEditor({ subjectId }: { subjectId?: string }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!title.trim() && !content.trim()) return;
    setSaving(true); setError(null);
    try {
      await createNote({
        title: title.trim() || "Untitled Note",
        content: content.trim() || undefined,
        study_subject_id: subjectId ?? null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Note title…"
        className="text-2xl font-bold bg-transparent border-none outline-none text-white placeholder:text-white/20 w-full"
      />
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Start writing your notes here…"
        className="flex-1 bg-transparent border-none outline-none text-gray-200 text-[15px] leading-relaxed resize-none placeholder:text-gray-600 w-full"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex items-center gap-3 pb-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-500/20 text-sm font-semibold transition-colors disabled:opacity-40"
        >
          {saving ? "Saving…" : saved ? "✓ Saved!" : "Save Note"}
        </button>
        <p className="text-xs text-gray-600">Ctrl+S to save</p>
      </div>
    </div>
  );
}

// ── Active Session View ───────────────────────────────────────────────────────
function ActiveSessionView({
  session, subjectName, timerSeconds, timerPaused, autoPaused,
  onPause, onResume, onComplete, onAbandon,
}: {
  session: StudySession;
  subjectName?: string;
  timerSeconds: number;
  timerPaused: boolean;
  autoPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onComplete: () => Promise<void>;
  onAbandon: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"docs" | "notes" | "flashcards" | "quiz">("notes");
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const [aiMessages, setAiMessages] = useState<{ role: "user" | "ai"; text: string }[]>([
    { role: "ai", text: "Hi! I'm your AI study assistant. Ask me to summarize your docs, generate a quiz, or explain any concept." },
  ]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const aiBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    aiBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  async function handleComplete() {
    setCompleting(true);
    await onComplete();
    setCompleting(false);
  }

  async function sendAiMessage(text?: string) {
    const msg = (text ?? aiInput).trim();
    if (!msg || aiLoading) return;
    setAiInput("");
    setAiMessages(prev => [...prev, { role: "user", text: msg }]);
    setAiLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${BASE_URL}/sessions/${session.id}/ai-events/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: msg }),
      });
      if (res.ok) {
        const data = await res.json();
        const reply = data.ai_response ?? data.response ?? data.content ?? "Done!";
        setAiMessages(prev => [...prev, { role: "ai", text: reply }]);
      } else {
        setAiMessages(prev => [...prev, { role: "ai", text: "I couldn't process that request right now. Try again?" }]);
      }
    } catch {
      setAiMessages(prev => [...prev, { role: "ai", text: "Connection error. Please try again." }]);
    } finally {
      setAiLoading(false);
    }
  }

  const tabNav = [
    {
      id: "docs", label: "Docs",
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>,
    },
    {
      id: "notes", label: "Notes",
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
    },
    {
      id: "flashcards", label: "Flashcards",
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
    },
    {
      id: "quiz", label: "Quiz",
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
    },
  ] as const;

  const goalMins = 90;
  const progressPct = Math.min(100, Math.round((timerSeconds / (goalMins * 60)) * 100));

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-[#0A0B1A]">
      {/* ── Auto-paused banner ── */}
      {autoPaused && (
        <div className="flex items-center justify-between px-6 py-2 bg-amber-500/10 border-b border-amber-400/20 shrink-0">
          <div className="flex items-center gap-2 text-amber-300 text-sm">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            <span>Session auto-paused due to inactivity</span>
          </div>
          <button
            onClick={onResume}
            className="text-xs px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 font-semibold transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            Resume
          </button>
        </div>
      )}

      {/* ── Top Header ── */}
      <header className="flex justify-between items-center px-6 py-4 border-b border-[#1E233A] bg-[#0A0B1A] z-10 shrink-0">
        <h1 className="text-xl font-bold text-white truncate max-w-xs">
          {session.title || session.intention_text?.slice(0, 50) || "Untitled Workspace"}
          {subjectName && <span className="text-[#B496FF] ml-2 text-base font-medium">— {subjectName}</span>}
        </h1>

        <div className="flex flex-col items-center flex-shrink-0">
          <div className="flex items-center text-xs text-[#A1A1AA] mb-1">
            {timerPaused
              ? <><svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>Paused</>
              : <><svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>Session Time</>
            }
          </div>
          <div className={`text-4xl font-bold tracking-tight leading-none font-mono ${timerPaused ? "text-amber-400" : "text-white"}`}>
            {fmt(timerSeconds)}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={timerPaused ? onResume : onPause}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#1E233A] bg-white/5 text-white hover:bg-white/10 transition-colors text-sm"
          >
            {timerPaused ? (
              <><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>Resume</>
            ) : (
              <><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>Pause</>
            )}
          </button>

          {!confirmEnd ? (
            <button
              onClick={() => setConfirmEnd(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#7C3AED] bg-[#7C3AED]/20 text-white hover:bg-[#7C3AED]/30 transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <rect x="4" y="4" width="12" height="12" rx="1.5" />
              </svg>
              End Session
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => setConfirmEnd(false)} className="px-3 py-2 rounded-lg text-xs text-[#A1A1AA] hover:text-white border border-[#1E233A] transition-colors">
                Cancel
              </button>
              <button
                onClick={handleComplete}
                disabled={completing}
                className="px-3 py-2 rounded-lg text-xs font-bold text-white bg-[#7C3AED] hover:bg-[#6D28D9] transition-colors disabled:opacity-50"
              >
                {completing ? "Saving…" : "✓ Confirm End"}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Main Layout ── */}
      <div className="flex flex-1 overflow-hidden p-4 gap-4">

        {/* Left Sidebar */}
        <aside className="w-64 flex flex-col bg-[#111424] rounded-xl p-4 shrink-0 overflow-y-auto">
          <div className="flex items-center text-xl font-bold mb-8">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center mr-3 flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            StudyBuddy
          </div>

          <nav className="flex-1 flex flex-col gap-2">
            {tabNav.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left w-full
                  ${activeTab === tab.id
                    ? "bg-[#7C3AED] text-white shadow-md"
                    : "text-[#A1A1AA] hover:bg-white/5 hover:text-white"}`}
              >
                <span className="w-5 mr-3 flex items-center justify-center">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="pt-4 border-t border-[#1E233A] mt-auto flex flex-col gap-1">
            {!confirmAbandon ? (
              <button
                onClick={() => setConfirmAbandon(true)}
                className="flex items-center px-4 py-3 rounded-lg text-[#A1A1AA] hover:bg-white/5 hover:text-red-400 transition-colors text-sm w-full"
              >
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Abandon Session
              </button>
            ) : (
              <div className="flex flex-col gap-1.5 px-1">
                <p className="text-xs text-red-400 font-semibold px-3">Abandon workspace?</p>
                <button onClick={onAbandon} className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-red-600/80 hover:bg-red-600 transition-colors">
                  Yes, abandon
                </button>
                <button onClick={() => setConfirmAbandon(false)} className="px-4 py-2 rounded-lg text-xs text-[#A1A1AA] hover:text-white transition-colors">
                  Cancel
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Center: content */}
        <main className="flex-1 flex flex-col bg-[#111424] rounded-xl overflow-hidden relative min-w-0">
          <div className="p-6 overflow-y-auto flex-1">
            {activeTab === "docs" && <SessionDocumentsPanel sessionId={session.id} />}
            {activeTab === "notes" && <WorkspaceNotesEditor subjectId={session.study_subject_id ?? undefined} />}
            {activeTab === "flashcards" && (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-400/15 flex items-center justify-center">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-bold text-lg">Flashcards</p>
                  <p className="text-[#A1A1AA] text-sm mt-1">Upload documents first — AI will generate flashcards automatically.</p>
                </div>
              </div>
            )}
            {activeTab === "quiz" && (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-400/15 flex items-center justify-center">
                  <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-bold text-lg">Quizzes</p>
                  <p className="text-[#A1A1AA] text-sm mt-1">Upload documents first — AI will generate quizzes automatically.</p>
                </div>
              </div>
            )}
          </div>

          {/* Floating toolbar (Notes only) */}
          {activeTab === "notes" && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#2D2D44] border border-[#4B4B6C] rounded-full px-4 py-2 flex items-center gap-3 shadow-xl">
              <button className="text-white hover:text-gray-300 w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 font-bold text-sm">B</button>
              <button className="text-white hover:text-gray-300 w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 italic text-sm">I</button>
              <button className="text-white hover:text-gray-300 w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 underline text-sm">U</button>
              <div className="h-6 border-l border-gray-700" />
              <button className="text-white hover:text-gray-300 w-8 h-8 flex items-center justify-center rounded hover:bg-white/10">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
              </button>
              <button className="text-white hover:text-gray-300 w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-xs font-bold">1.</button>
              <div className="h-6 border-l border-gray-700" />
              <button
                onClick={() => sendAiMessage("Summarize my notes")}
                className="text-[#B496FF] hover:text-white w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 font-bold text-sm"
              >
                AI
              </button>
              <button
                onClick={() => sendAiMessage("Generate a quiz from my notes")}
                className="text-[#B496FF] hover:text-white w-8 h-8 flex items-center justify-center rounded hover:bg-white/10"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              </button>
            </div>
          )}
        </main>

        {/* Right: AI assistant + session progress */}
        <aside className="w-96 flex flex-col gap-4 shrink-0">

          {/* AI Study Assistant */}
          <div className="bg-[#111424] rounded-xl flex flex-col flex-1 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-[#1E233A] shrink-0">
              <h3 className="font-bold text-white">AI Study Assistant</h3>
              {aiLoading && (
                <svg className="w-4 h-4 animate-spin text-[#B496FF]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4 text-sm">
              {aiMessages.map((msg, i) => (
                msg.role === "user" ? (
                  <div key={i} className="flex justify-end">
                    <div className="bg-[#7C3AED] text-white px-4 py-2 rounded-2xl rounded-tr-none max-w-[85%] leading-relaxed">
                      {msg.text}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0 mt-1">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                      </svg>
                    </div>
                    <div className="bg-[#1E233A] text-gray-200 px-4 py-3 rounded-2xl rounded-tl-none max-w-[85%] leading-relaxed">
                      {msg.text}
                    </div>
                  </div>
                )
              ))}
              {aiLoading && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                    </svg>
                  </div>
                  <div className="bg-[#1E233A] px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={aiBottomRef} />
            </div>

            {/* Quick actions */}
            <div className="px-4 pb-3 flex flex-wrap gap-2 shrink-0">
              {["Summarize Document", "Generate Quiz from Notes", "Explain Concept", "Find Related Resources"].map(a => (
                <button
                  key={a}
                  onClick={() => sendAiMessage(a)}
                  className="px-3 py-1.5 rounded-full border border-[#2D2A54] bg-[#1A1836] text-xs text-gray-300 hover:bg-[#2D2A54] transition-colors"
                >
                  {a}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="p-4 pt-0 shrink-0">
              <div className="relative">
                <input
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAiMessage(); } }}
                  placeholder="Ask anything…"
                  className="w-full bg-[#0A0A10] border border-[#1E233A] rounded-lg py-3 pl-4 pr-10 text-sm text-white placeholder:text-[#A1A1AA]/50 outline-none focus:border-[#7C3AED] transition"
                />
                <button
                  onClick={() => sendAiMessage()}
                  disabled={aiLoading || !aiInput.trim()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7C3AED] hover:text-[#B496FF] transition-colors disabled:opacity-30"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Session Progress */}
          <div className="bg-[#111424] rounded-xl p-5 shrink-0">
            <h3 className="font-bold text-white mb-4">Session Progress</h3>
            <div className="space-y-2 text-sm mb-4">
              {[
                { label: "Time Focused", value: fmt(timerSeconds) },
                { label: "Status", value: timerPaused ? "Paused" : "Active" },
                { label: "Session Type", value: session.session_type },
                ...(session.intention_type ? [{ label: "Focus", value: session.intention_type.replace("_", " ") }] : []),
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center">
                  <span className="text-gray-300">{row.label}:</span>
                  <span className="text-white capitalize">{row.value}</span>
                </div>
              ))}
            </div>
            <div className="w-full bg-[#2D2D44] h-2 rounded-full mb-2">
              <div
                className="bg-[#7C3AED] h-2 rounded-full transition-all duration-1000"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="text-xs text-gray-400">{progressPct}% of {goalMins}-min goal</div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ── Session Card ──────────────────────────────────────────────────────────────
function SessionCard({
  session, subjectName, isPaused, onStart, onContinue, onResume, onDelete, hasActive,
}: {
  session: StudySession;
  subjectName?: string;
  isPaused: boolean;
  onStart: (s: StudySession) => void;
  onContinue: () => void;
  onResume: (s: StudySession) => void;
  onDelete: (s: StudySession) => void;
  hasActive: boolean;
}) {
  const style = statusStyles[session.status];
  const isCompleted = session.status === "completed";

  return (
    <div className={`group bg-white/[0.04] border rounded-2xl p-5 flex flex-col gap-4
                     hover:bg-white/[0.07] transition-all duration-200
                     ${isCompleted ? "border-indigo-500/15 hover:border-indigo-500/30"
                       : isPaused ? "border-amber-500/20 hover:border-amber-500/40"
                       : "border-white/[0.08] hover:border-amber-500/20"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white font-semibold leading-snug">
              {session.title || session.intention_text?.slice(0, 40) || "Untitled Workspace"}
            </p>
            {isPaused ? (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-500/15 text-amber-400 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                Paused
              </span>
            ) : (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}>
                {style.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-gray-400 border border-white/[0.08] capitalize">
              {session.session_type}
            </span>
            {subjectName && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-400/20">
                {subjectName}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => onDelete(session)}
          className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10
                     transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {session.intention_text && (
        <p className="text-sm text-gray-400 leading-relaxed line-clamp-2">{session.intention_text}</p>
      )}

      {isCompleted && (
        <div className="flex items-center gap-4 py-3 px-4 rounded-xl bg-indigo-500/8 border border-indigo-500/15">
          <div className="flex flex-col gap-0.5">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Duration</p>
            <p className="text-sm font-bold text-indigo-300">{fmtDuration(session.duration_minutes)}</p>
          </div>
          {session.ended_at && (
            <div className="flex flex-col gap-0.5 border-l border-indigo-500/20 pl-4">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Completed</p>
              <p className="text-sm font-bold text-indigo-300">
                {new Date(session.ended_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-auto">
        <p className="text-xs text-gray-600">{fmtDate(session.created_at)}</p>
        {isPaused && (
          <button
            onClick={onContinue}
            className="text-xs px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/40
                       text-amber-400 font-semibold transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            Continue
          </button>
        )}
        {session.status === "active" && !isPaused && !hasActive && (
          <button
            onClick={() => onResume(session)}
            className="text-xs px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/40
                       text-amber-400 font-semibold transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            Resume
          </button>
        )}
        {session.status === "pending" && !isPaused && (
          <button
            onClick={() => onStart(session)}
            disabled={hasActive}
            title={hasActive ? "Complete the active workspace first" : "Start workspace"}
            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40
                       text-emerald-400 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Start
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
const SessionsSection = forwardRef<SessionsSectionHandle, Props>(({ subjects, subjectId }, ref) => {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const [activeSession, setActiveSession] = useState<StudySession | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerPaused, setTimerPaused] = useState(false);
  const [autoPaused, setAutoPaused] = useState(false);
  const timerStateRef = useRef<TimerState>({ sessionId: "", subjectId: null, offsetSeconds: 0, startMs: null });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef(Date.now());
  const autoPausedRef = useRef(false);
  const INACTIVITY_MS = 3 * 60 * 1000;

  const [showCreate, setShowCreate] = useState(false);
  const [intentionText, setIntentionText] = useState("");
  const [intentionType, setIntentionType] = useState<IntentionType | "">("");
  const [sessionType, setSessionType] = useState("solo");
  const [formSubjectId, setFormSubjectId] = useState("");
  const [sessionTitle, setSessionTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const intentionRef = useRef<HTMLTextAreaElement>(null);

  const [deleteTarget, setDeleteTarget] = useState<StudySession | null>(null);
  const [deleting, setDeleting] = useState(false);

  useImperativeHandle(ref, () => ({ openCreate }));

  async function load() {
    setLoading(true); setError(null);
    try {
      const list = subjectId ? await getSessionsBySubject(subjectId) : await getSessions();
      setSessions(list);
      restoreTimer(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }

  function restoreTimer(list: StudySession[]) {
    try {
      const raw = localStorage.getItem(LS_TIMER);
      if (!raw) return;
      const saved: TimerState = JSON.parse(raw);
      const session = list.find(s => s.id === saved.sessionId && s.status === "active");
      if (!session) { localStorage.removeItem(LS_TIMER); setTimeout(() => dispatchSessionChange(false), 0); return; }
      timerStateRef.current = saved;
      setActiveSession(session);
      setTimerPaused(saved.startMs === null);
      setTimerSeconds(getElapsed(saved));
      if (saved.startMs !== null) startInterval();
      setTimeout(() => dispatchSessionChange(true, session), 0);
    } catch {
      localStorage.removeItem(LS_TIMER);
    }
  }

  useEffect(() => {
    load();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  useEffect(() => {
    if (showCreate) setTimeout(() => intentionRef.current?.focus(), 50);
  }, [showCreate]);

  // Track user activity to support auto-pause on inactivity
  useEffect(() => {
    const update = () => { lastActivityRef.current = Date.now(); };
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach(e => window.addEventListener(e, update, { passive: true }));
    return () => events.forEach(e => window.removeEventListener(e, update));
  }, []);

  // Inactivity checker: auto-pause after INACTIVITY_MS of no activity
  useEffect(() => {
    const checker = setInterval(() => {
      if (!timerStateRef.current.startMs) return; // already paused
      const idle = Date.now() - lastActivityRef.current;
      if (idle >= INACTIVITY_MS) handleAutoPause();
    }, 30_000); // check every 30 s
    return () => clearInterval(checker);
  }, []);

  function startInterval() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setTimerSeconds(getElapsed(timerStateRef.current));
    }, 1000);
  }

  function saveTimer() {
    localStorage.setItem(LS_TIMER, JSON.stringify(timerStateRef.current));
  }

  function beginTimer(sessionId: string, sessionSubjectId: string | null) {
    timerStateRef.current = { sessionId, subjectId: sessionSubjectId, offsetSeconds: 0, startMs: Date.now() };
    setTimerSeconds(0);
    setTimerPaused(false);
    saveTimer();
    startInterval();
  }

  function handlePause() {
    if (!timerStateRef.current.startMs) return;
    autoPausedRef.current = false;
    setAutoPaused(false);
    timerStateRef.current.offsetSeconds += Math.floor((Date.now() - timerStateRef.current.startMs) / 1000);
    timerStateRef.current.startMs = null;
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setTimerPaused(true);
    saveTimer();
  }

  function handleResume() {
    autoPausedRef.current = false;
    setAutoPaused(false);
    lastActivityRef.current = Date.now();
    timerStateRef.current.startMs = Date.now();
    setTimerPaused(false);
    saveTimer();
    startInterval();
  }

  function handleAutoPause() {
    if (!timerStateRef.current.startMs) return;
    autoPausedRef.current = true;
    setAutoPaused(true);
    timerStateRef.current.offsetSeconds += Math.floor((Date.now() - timerStateRef.current.startMs) / 1000);
    timerStateRef.current.startMs = null;
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setTimerPaused(true);
    saveTimer();
  }

  async function handleResumeExistingSession(session: StudySession) {
    if (activeSession) return;
    timerStateRef.current = { sessionId: session.id, subjectId: session.study_subject_id, offsetSeconds: 0, startMs: Date.now() };
    setActiveSession(session);
    setTimerPaused(false);
    setAutoPaused(false);
    autoPausedRef.current = false;
    lastActivityRef.current = Date.now();
    setTimerSeconds(0);
    saveTimer();
    startInterval();
    dispatchSessionChange(true, session);
  }

  function clearTimerState() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    localStorage.removeItem(LS_TIMER);
    timerStateRef.current = { sessionId: "", subjectId: null, offsetSeconds: 0, startMs: null };
    setTimerSeconds(0);
    setTimerPaused(false);
  }

  function dispatchSessionChange(hasActive: boolean, session?: StudySession) {
    window.dispatchEvent(new CustomEvent("sb-session-changed", {
      detail: { hasActive, sessionId: session?.id, subjectId: session?.study_subject_id ?? null, title: session?.title || session?.intention_text || "" },
    }));
  }

  function openCreate() {
    setIntentionText(""); setIntentionType(""); setSessionType("solo");
    setFormSubjectId(subjectId ?? ""); setSessionTitle(""); setCreateError(null);
    setShowCreate(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!intentionText.trim()) return;
    setCreating(true); setCreateError(null);
    try {
      const session = await createSession({
        session_type: sessionType,
        title: sessionTitle.trim() || undefined,
        study_subject_id: formSubjectId || null,
        intention_type: (intentionType as IntentionType) || undefined,
        intention_text: intentionText.trim(),
      });
      const activated = await updateSession(session.id, {
        status: "active",
        actual_started_at: new Date().toISOString(),
      });
      setSessions(prev => [activated, ...prev]);
      setActiveSession(activated);
      beginTimer(activated.id, activated.study_subject_id);
      dispatchSessionChange(true, activated);
      setShowCreate(false);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to start session");
    } finally {
      setCreating(false);
    }
  }

  async function handleStart(session: StudySession) {
    if (activeSession) return;
    try {
      const updated = await updateSession(session.id, {
        status: "active",
        actual_started_at: new Date().toISOString(),
      });
      setSessions(prev => prev.map(s => s.id === updated.id ? updated : s));
      setActiveSession(updated);
      beginTimer(updated.id, updated.study_subject_id);
      dispatchSessionChange(true, updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start session");
    }
  }

  // Continue a paused session (just scroll/focus back to the active view)
  function handleContinuePaused() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleComplete() {
    if (!activeSession) return;
    const elapsed = getElapsed(timerStateRef.current);
    const durationMinutes = Math.max(1, Math.round(elapsed / 60));
    try {
      const updated = await updateSession(activeSession.id, {
        status: "completed",
        ended_at: new Date().toISOString(),
        duration_minutes: durationMinutes,
        is_completed: true,
      });
      setSessions(prev => prev.map(s => s.id === updated.id ? updated : s));
      setActiveSession(null);
      clearTimerState();
      dispatchSessionChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to complete session");
    }
  }

  async function handleAbandon() {
    if (!activeSession) return;
    try {
      const updated = await updateSession(activeSession.id, {
        status: "abandoned",
        ended_at: new Date().toISOString(),
      });
      setSessions(prev => prev.map(s => s.id === updated.id ? updated : s));
      setActiveSession(null);
      clearTimerState();
      dispatchSessionChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to abandon session");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSession(deleteTarget.id);
      setSessions(prev => prev.filter(s => s.id !== deleteTarget.id));
      if (activeSession?.id === deleteTarget.id) { setActiveSession(null); clearTimerState(); }
      setDeleteTarget(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete session");
    } finally {
      setDeleting(false);
    }
  }

  const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s.name]));
  const subjectOptions = subjects.map(s => ({ value: s.id, label: s.name }));

  const counts: Record<Filter, number> = {
    all:       sessions.length,
    pending:   sessions.filter(s => s.status === "pending").length,
    active:    sessions.filter(s => s.status === "active").length,
    completed: sessions.filter(s => s.status === "completed").length,
    abandoned: sessions.filter(s => s.status === "abandoned").length,
  };
  const filtered = filter === "all" ? sessions : sessions.filter(s => s.status === filter);

  // When a session is active, render the full-screen workspace (breaks out of page padding)
  if (activeSession) {
    return (
      <ActiveSessionView
        session={activeSession}
        subjectName={activeSession.study_subject_id ? subjectMap[activeSession.study_subject_id] : undefined}
        timerSeconds={timerSeconds}
        timerPaused={timerPaused}
        autoPaused={autoPaused}
        onPause={handlePause}
        onResume={handleResume}
        onComplete={handleComplete}
        onAbandon={handleAbandon}
      />
    );
  }

  return (
    <>
      <div className="flex flex-col gap-8">
        {error && (
          <div className="rounded-2xl bg-red-500/10 border border-red-400/20 px-5 py-4 text-sm text-red-300 flex items-center justify-between">
            {error}
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200 ml-4">✕</button>
          </div>
        )}

        {/* Session history */}
        <div className="flex flex-col gap-5">
          {!loading && sessions.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {(["all", "pending", "completed", "abandoned"] as Filter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize
                    ${filter === f
                      ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/30"
                      : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"}`}
                >
                  {f} {counts[f] > 0 && <span className="ml-1 opacity-60">{counts[f]}</span>}
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 h-32 animate-pulse" />
              ))}
            </div>
          )}

          {!loading && sessions.length === 0 && (
            <div className="flex flex-col items-center gap-6 py-32 text-center">
              <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-400/15 flex items-center justify-center">
                <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-bold text-xl">No workspaces yet</p>
                <p className="text-gray-500 text-sm mt-1">Start a workspace to track your study time and upload materials</p>
              </div>
              <button
                onClick={openCreate}
                className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-2xl font-bold transition-colors"
              >
                Start a Workspace
              </button>
            </div>
          )}

          {!loading && sessions.length > 0 && filtered.length === 0 && (
            <p className="text-gray-500 text-sm py-8 text-center">No {filter} workspaces.</p>
          )}

          {!loading && filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(s => (
                <SessionCard
                  key={s.id}
                  session={s}
                  subjectName={s.study_subject_id ? subjectMap[s.study_subject_id] : undefined}
                  isPaused={!!(activeSession?.id === s.id && timerPaused)}
                  onStart={handleStart}
                  onContinue={handleContinuePaused}
                  onResume={handleResumeExistingSession}
                  onDelete={setDeleteTarget}
                  hasActive={!!activeSession}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create session modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Set Your Study Intention</h2>
                <p className="text-sm text-gray-500 mt-0.5">What do you want to achieve in this workspace?</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white transition-colors p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex flex-col gap-5">
              <Field label="What will you study? *">
                <textarea
                  ref={intentionRef}
                  required
                  value={intentionText}
                  onChange={e => setIntentionText(e.target.value)}
                  placeholder="e.g. Master the chain rule and work through practice problems from Chapter 3…"
                  rows={3}
                  className={`${inputCls} resize-none`}
                />
              </Field>
              <Field label="Workspace focus">
                <select value={intentionType} onChange={e => setIntentionType(e.target.value as IntentionType | "")} className={inputCls}>
                  <option value="">— Select a type —</option>
                  <option value="review">Review</option>
                  <option value="learn_new">Learn new material</option>
                  <option value="practice">Practice</option>
                  <option value="exam_prep">Exam preparation</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              {!subjectId && subjects.length > 0 && (
                <Field label="Subject (optional)">
                  <select value={formSubjectId} onChange={e => setFormSubjectId(e.target.value)} className={inputCls}>
                    <option value="">— None —</option>
                    {subjectOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
              )}
              <Field label="Format">
                <select value={sessionType} onChange={e => setSessionType(e.target.value)} className={inputCls}>
                  <option value="solo">Solo</option>
                  <option value="group">Group</option>
                  <option value="exam_prep">Exam Prep</option>
                  <option value="review">Review</option>
                  <option value="practice">Practice</option>
                </select>
              </Field>
              <Field label="Workspace title (optional)">
                <input
                  type="text"
                  value={sessionTitle}
                  onChange={e => setSessionTitle(e.target.value)}
                  placeholder="e.g. Chapter 3 Review"
                  className={inputCls}
                />
              </Field>
              {createError && <p className="text-sm text-red-400">{createError}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-3 rounded-xl border border-white/15 text-gray-400 hover:text-white
                             hover:border-white/30 font-semibold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !intentionText.trim()}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl
                             font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                             flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {creating ? "Starting…" : "Start Workspace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Delete Workspace</h2>
              <button onClick={() => setDeleteTarget(null)} className="text-gray-500 hover:text-white transition-colors p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={e => { e.preventDefault(); handleDelete(); }} className="flex flex-col gap-6">
              <p className="text-gray-400 text-sm leading-relaxed">
                Delete <span className="text-white font-semibold">
                  "{deleteTarget.title || deleteTarget.intention_text?.slice(0, 40) || "Untitled Workspace"}"
                </span>? This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-3 rounded-xl border border-white/15 text-gray-400 hover:text-white
                             hover:border-white/30 font-semibold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleting}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl
                             font-bold text-sm transition-colors disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
});

SessionsSection.displayName = "SessionsSection";
export default SessionsSection;
