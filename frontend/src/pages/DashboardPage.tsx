import { useEffect, useState, useRef } from "react";
import { getSubjects, createSubject, updateSubject, deleteSubject, type Subject } from "../api/subjects";
import { getNotes, createNote, updateNote, deleteNote, type Note } from "../api/notes";
import { getSessions, createSession, updateSession, deleteSession, type StudySession, type SessionStatus, type IntentionType } from "../api/sessions";
import {
  getMainDashboard, getDashboardStats, getLastSession, getFlashcardsDue,
  getQuizPerformance, getCollaboration, dismissRecommendation, getCurrentUser,
  type MainDashboard, type DashboardStats, type StudySession as DashSession,
  type FlashcardDue, type StudyGroup, type UserProfile,
} from "../api/dashboard";
import OverviewSection from "./OverviewSection";
interface Props {
  onSignOut: () => void;
  onGoToHome: () => void;
}

import SettingsSection from "./SettingsSection";

// ── Shared Modal ───────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
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

// ── Types ──────────────────────────────────────────────────────────────────────
type Section = "overview" | "subjects" | "notes" | "sessions" | "settings";

// ── Nav items ──────────────────────────────────────────────────────────────────
const navItems: { id: Section; label: string; icon: React.ReactNode }[] = [
  {
    id: "overview", label: "Overview",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  },
  {
    id: "subjects", label: "Subjects",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
  },
  {
    id: "notes", label: "Notes",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
  },
  {
    id: "sessions", label: "Sessions",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  },
  {
    id: "settings", label: "Settings",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
];

// ── Subject Card ───────────────────────────────────────────────────────────────
function SubjectCard({ subject, onRename, onDelete, compact = false }: {
  subject: Subject; onRename: (s: Subject) => void; onDelete: (s: Subject) => void; compact?: boolean;
}) {
  return (
    <div className={`group bg-white/[0.04] border border-white/[0.08] rounded-2xl flex flex-col gap-3
                     hover:bg-white/[0.08] hover:border-indigo-500/30 transition-all duration-200
                     ${compact ? "p-4" : "p-6"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-400/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onRename(subject)} title="Rename"
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button onClick={() => onDelete(subject)} title="Delete"
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      <p className="text-white font-semibold leading-snug">{subject.name}</p>
      <p className="text-xs text-gray-600 mt-auto">
        {new Date(subject.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </p>
    </div>
  );
}

// ── Note Card ──────────────────────────────────────────────────────────────────
function NoteCard({ note, subjectName, onEdit, onDelete }: {
  note: Note; subjectName?: string; onEdit: (n: Note) => void; onDelete: (n: Note) => void;
}) {
  return (
    <div className="group bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 flex flex-col gap-3
                    hover:bg-white/[0.07] hover:border-violet-500/30 transition-all duration-200">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold leading-snug truncate">{note.title}</p>
          {subjectName && (
            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-400/20">
              {subjectName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => onEdit(note)} title="Edit"
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button onClick={() => onDelete(note)} title="Delete"
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      {note.content && (
        <p className="text-sm text-gray-400 leading-relaxed line-clamp-3">{note.content}</p>
      )}
      {!note.content && (
        <p className="text-sm text-gray-600 italic">No content</p>
      )}
      <p className="text-xs text-gray-600 mt-auto">
        {new Date(note.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </p>
    </div>
  );
}

// ── Session Card ───────────────────────────────────────────────────────────────
const statusStyles: Record<SessionStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-gray-500/15", text: "text-gray-400", label: "Pending" },
  active: { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "Active" },
  completed: { bg: "bg-indigo-500/15", text: "text-indigo-400", label: "Completed" },
  abandoned: { bg: "bg-red-500/15", text: "text-red-400", label: "Abandoned" },
};

function SessionCard({ session, subjectName, onStatusChange, onDelete }: {
  session: StudySession; subjectName?: string;
  onStatusChange: (s: StudySession, status: SessionStatus) => void;
  onDelete: (s: StudySession) => void;
}) {
  const style = statusStyles[session.status];

  return (
    <div className="group bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 flex flex-col gap-4
                    hover:bg-white/[0.07] hover:border-amber-500/30 transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white font-semibold leading-snug">
              {session.title || "Untitled Session"}
            </p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}>
              {style.label}
            </span>
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
        <button onClick={() => onDelete(session)} title="Delete"
          className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {session.intention_text && (
        <p className="text-sm text-gray-400 leading-relaxed line-clamp-2">{session.intention_text}</p>
      )}

      <div className="flex items-center justify-between mt-auto">
        <p className="text-xs text-gray-600">
          {new Date(session.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
        <div className="flex items-center gap-2">
          {session.status === "pending" && (
            <button onClick={() => onStatusChange(session, "active")}
              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 font-medium transition-colors">
              Start
            </button>
          )}
          {session.status === "active" && (
            <button onClick={() => onStatusChange(session, "completed")}
              className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 font-medium transition-colors">
              Complete
            </button>
          )}
          {(session.status === "pending" || session.status === "active") && (
            <button onClick={() => onStatusChange(session, "abandoned")}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-400 font-medium transition-colors">
              Abandon
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Shared Inputs ──────────────────────────────────────────────────────────────
function TextInput({ value, onChange, placeholder, inputRef, label, required = true }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement>; label: string; required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-400">{label}</label>
      <input ref={inputRef} type="text" required={required} value={value}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-xl bg-white/[0.08] border border-white/15 px-4 py-3 text-white
                   placeholder:text-gray-600 outline-none text-sm
                   focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition" />
    </div>
  );
}

function TextAreaInput({ value, onChange, placeholder, label }: {
  value: string; onChange: (v: string) => void; placeholder?: string; label: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-400">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={4}
        className="w-full rounded-xl bg-white/[0.08] border border-white/15 px-4 py-3 text-white
                   placeholder:text-gray-600 outline-none text-sm resize-none
                   focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition" />
    </div>
  );
}

function SelectInput({ value, onChange, label, options, required = false }: {
  value: string; onChange: (v: string) => void; label: string;
  options: { value: string; label: string }[]; required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-400">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} required={required}
        className="w-full rounded-xl bg-white/[0.08] border border-white/15 px-4 py-3 text-white
                   outline-none text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition
                   [&>option]:bg-slate-800">
        {!required && <option value="">— None —</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function ModalActions({ onCancel, submitLabel, loading, danger = false, disabled = false }: {
  onCancel: () => void; submitLabel: string; loading: boolean; danger?: boolean; disabled?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <button type="button" onClick={onCancel}
        className="flex-1 py-3 rounded-xl border border-white/15 text-gray-400 hover:text-white
                   hover:border-white/30 font-semibold text-sm transition-colors">
        Cancel
      </button>
      <button type="submit" disabled={loading || disabled}
        className={`flex-1 text-white py-3 rounded-xl font-bold text-sm transition-colors
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${danger ? "bg-red-600 hover:bg-red-500" : "bg-indigo-600 hover:bg-indigo-500"}`}>
        {loading ? `${submitLabel.replace(/.$/, "…")}` : submitLabel}
      </button>
    </div>
  );
}

// ── Loading skeleton ───────────────────────────────────────────────────────────
function SkeletonGrid({ cols = 3 }: { cols?: number }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${cols === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-4`}>
      {Array.from({ length: cols === 4 ? 8 : 6 }).map((_, i) => (
        <div key={i} className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 h-32 animate-pulse" />
      ))}
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function DashboardPage({ onSignOut, onGoToHome }: Props) {
  const [section, setSection] = useState<Section>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Subjects state ──────────────────────────────────────────────────────────
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [subjectsError, setSubjectsError] = useState<string | null>(null);
  const [showCreateSubject, setShowCreateSubject] = useState(false);
  const [createSubjectName, setCreateSubjectName] = useState("");
  const [createSubjectLoading, setCreateSubjectLoading] = useState(false);
  const [createSubjectError, setCreateSubjectError] = useState<string | null>(null);
  const createSubjectRef = useRef<HTMLInputElement>(null);
  const [renameSubject, setRenameSubject] = useState<Subject | null>(null);
  const [renameName, setRenameName] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [deleteSubjectTarget, setDeleteSubjectTarget] = useState<Subject | null>(null);
  const [deleteSubjectLoading, setDeleteSubjectLoading] = useState(false);

  // ── Notes state ─────────────────────────────────────────────────────────────
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [showCreateNote, setShowCreateNote] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteSubjectId, setNoteSubjectId] = useState("");
  const [noteFormLoading, setNoteFormLoading] = useState(false);
  const [noteFormError, setNoteFormError] = useState<string | null>(null);
  const [editNote, setEditNote] = useState<Note | null>(null);
  const [deleteNoteTarget, setDeleteNoteTarget] = useState<Note | null>(null);
  const [deleteNoteLoading, setDeleteNoteLoading] = useState(false);
  const noteTitleRef = useRef<HTMLInputElement>(null);

  // ── Sessions state ──────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionType, setSessionType] = useState("solo");
  const [sessionSubjectId, setSessionSubjectId] = useState("");
  const [sessionIntentionType, setSessionIntentionType] = useState("");
  const [sessionIntentionText, setSessionIntentionText] = useState("");
  const [sessionFormLoading, setSessionFormLoading] = useState(false);
  const [sessionFormError, setSessionFormError] = useState<string | null>(null);
  const [deleteSessionTarget, setDeleteSessionTarget] = useState<StudySession | null>(null);
  const [deleteSessionLoading, setDeleteSessionLoading] = useState(false);

  // ── Dashboard widget state ───────────────────────────────────────────────────
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [dashMain, setDashMain] = useState<MainDashboard | null>(null);
  const [dashStats, setDashStats] = useState<DashboardStats | null>(null);
  const [dashLastSession, setDashLastSession] = useState<DashSession | null | undefined>(undefined);
  const [dashFlashcards, setDashFlashcards] = useState<{ due_count: number; cards: FlashcardDue[] } | null>(null);
  const [dashQuiz, setDashQuiz] = useState<{ attempts_count: number; avg_score_pct: number | null; recent_attempts: any[] } | null>(null);
  const [dashCollab, setDashCollab] = useState<{ groups_count: number; groups: StudyGroup[] } | null>(null);
  const [dashLoading, setDashLoading] = useState(true);

  // ── Focus effects ───────────────────────────────────────────────────────────
  useEffect(() => { if (showCreateSubject) setTimeout(() => createSubjectRef.current?.focus(), 50); }, [showCreateSubject]);
  useEffect(() => { if (renameSubject) setTimeout(() => renameInputRef.current?.focus(), 50); }, [renameSubject]);
  useEffect(() => { if (showCreateNote || editNote) setTimeout(() => noteTitleRef.current?.focus(), 50); }, [showCreateNote, editNote]);

  // ── Data loaders ────────────────────────────────────────────────────────────
  async function loadSubjects() {
    setSubjectsLoading(true); setSubjectsError(null);
    try { setSubjects(await getSubjects()); }
    catch (e) { setSubjectsError(e instanceof Error ? e.message : "Failed to load subjects"); }
    finally { setSubjectsLoading(false); }
  }

  async function loadNotes() {
    setNotesLoading(true); setNotesError(null);
    try { setNotes(await getNotes()); }
    catch (e) { setNotesError(e instanceof Error ? e.message : "Failed to load notes"); }
    finally { setNotesLoading(false); }
  }

  async function loadSessions() {
    setSessionsLoading(true); setSessionsError(null);
    try { setSessions(await getSessions()); }
    catch (e) { setSessionsError(e instanceof Error ? e.message : "Failed to load sessions"); }
    finally { setSessionsLoading(false); }
  }

  async function loadDashboard() {
    setDashLoading(true);
    try {
      const [me, main, stats, lastSess, flashcards, quiz, collab] = await Promise.allSettled([
        getCurrentUser(),
        getMainDashboard(7),
        getDashboardStats(),
        getLastSession(),
        getFlashcardsDue(20),
        getQuizPerformance(10),
        getCollaboration(),
      ]);
      if (me.status === "fulfilled") setUserProfile(me.value);
      if (main.status === "fulfilled") setDashMain(main.value);
      if (stats.status === "fulfilled") setDashStats(stats.value);
      if (lastSess.status === "fulfilled") setDashLastSession(lastSess.value.session);
      if (flashcards.status === "fulfilled") setDashFlashcards(flashcards.value);
      if (quiz.status === "fulfilled") setDashQuiz(quiz.value);
      if (collab.status === "fulfilled") setDashCollab(collab.value);
    } finally {
      setDashLoading(false);
    }
  }

  useEffect(() => { loadSubjects(); loadNotes(); loadSessions(); loadDashboard(); }, []);

  // ── Subject handlers ────────────────────────────────────────────────────────
  async function handleCreateSubject(e: React.FormEvent) {
    e.preventDefault();
    if (!createSubjectName.trim()) return;
    setCreateSubjectLoading(true); setCreateSubjectError(null);
    try {
      const s = await createSubject(createSubjectName.trim());
      setSubjects((prev) => [s, ...prev]);
      setCreateSubjectName(""); setShowCreateSubject(false);
    } catch (e) { setCreateSubjectError(e instanceof Error ? e.message : "Failed to create"); }
    finally { setCreateSubjectLoading(false); }
  }

  async function handleRenameSubject(e: React.FormEvent) {
    e.preventDefault();
    if (!renameSubject || !renameName.trim()) return;
    setRenameLoading(true); setRenameError(null);
    try {
      const updated = await updateSubject(renameSubject.id, renameName.trim());
      setSubjects((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setRenameSubject(null);
    } catch (e) { setRenameError(e instanceof Error ? e.message : "Failed to rename"); }
    finally { setRenameLoading(false); }
  }

  async function handleDeleteSubject() {
    if (!deleteSubjectTarget) return;
    setDeleteSubjectLoading(true);
    try {
      await deleteSubject(deleteSubjectTarget.id);
      setSubjects((prev) => prev.filter((s) => s.id !== deleteSubjectTarget.id));
      setDeleteSubjectTarget(null);
    } catch (e) { setSubjectsError(e instanceof Error ? e.message : "Failed to delete"); setDeleteSubjectTarget(null); }
    finally { setDeleteSubjectLoading(false); }
  }

  function openCreateSubject() { setCreateSubjectName(""); setCreateSubjectError(null); setShowCreateSubject(true); }
  function openRenameSubject(s: Subject) { setRenameSubject(s); setRenameName(s.name); setRenameError(null); }

  // ── Note handlers ───────────────────────────────────────────────────────────
  function openCreateNote() {
    setNoteTitle(""); setNoteContent(""); setNoteSubjectId(""); setNoteFormError(null); setShowCreateNote(true);
  }

  function openEditNote(n: Note) {
    setEditNote(n); setNoteTitle(n.title); setNoteContent(n.content ?? "");
    setNoteSubjectId(n.study_subject_id ?? ""); setNoteFormError(null);
  }

  async function handleCreateNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteTitle.trim()) return;
    setNoteFormLoading(true); setNoteFormError(null);
    try {
      const n = await createNote({
        title: noteTitle.trim(),
        content: noteContent.trim() || undefined,
        study_subject_id: noteSubjectId || null,
      });
      setNotes((prev) => [n, ...prev]);
      setShowCreateNote(false);
    } catch (e) { setNoteFormError(e instanceof Error ? e.message : "Failed to create note"); }
    finally { setNoteFormLoading(false); }
  }

  async function handleUpdateNote(e: React.FormEvent) {
    e.preventDefault();
    if (!editNote || !noteTitle.trim()) return;
    setNoteFormLoading(true); setNoteFormError(null);
    try {
      const updated = await updateNote(editNote.id, {
        title: noteTitle.trim(),
        content: noteContent.trim() || undefined,
        study_subject_id: noteSubjectId || null,
      });
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      setEditNote(null);
    } catch (e) { setNoteFormError(e instanceof Error ? e.message : "Failed to update note"); }
    finally { setNoteFormLoading(false); }
  }

  async function handleDeleteNote() {
    if (!deleteNoteTarget) return;
    setDeleteNoteLoading(true);
    try {
      await deleteNote(deleteNoteTarget.id);
      setNotes((prev) => prev.filter((n) => n.id !== deleteNoteTarget.id));
      setDeleteNoteTarget(null);
    } catch (e) { setNotesError(e instanceof Error ? e.message : "Failed to delete note"); setDeleteNoteTarget(null); }
    finally { setDeleteNoteLoading(false); }
  }

  // ── Session handlers ────────────────────────────────────────────────────────
  function openCreateSession() {
    setSessionTitle(""); setSessionType("solo"); setSessionSubjectId("");
    setSessionIntentionType(""); setSessionIntentionText(""); setSessionFormError(null); setShowCreateSession(true);
  }

  async function handleCreateSession(e: React.FormEvent) {
    e.preventDefault();
    setSessionFormLoading(true); setSessionFormError(null);
    try {
      const s = await createSession({
        session_type: sessionType,
        title: sessionTitle.trim() || undefined,
        study_subject_id: sessionSubjectId || null,
        intention_type: (sessionIntentionType as IntentionType) || undefined,
        intention_text: sessionIntentionText.trim() || undefined,
      });
      setSessions((prev) => [s, ...prev]);
      setShowCreateSession(false);
    } catch (e) { setSessionFormError(e instanceof Error ? e.message : "Failed to create session"); }
    finally { setSessionFormLoading(false); }
  }

  async function handleSessionStatusChange(session: StudySession, newStatus: SessionStatus) {
    try {
      const data: Parameters<typeof updateSession>[1] = { status: newStatus };
      if (newStatus === "active") data.actual_started_at = new Date().toISOString();
      if (newStatus === "completed" || newStatus === "abandoned") data.ended_at = new Date().toISOString();
      const updated = await updateSession(session.id, data);
      setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (e) { setSessionsError(e instanceof Error ? e.message : "Failed to update session"); }
  }

  async function handleDeleteSession() {
    if (!deleteSessionTarget) return;
    setDeleteSessionLoading(true);
    try {
      await deleteSession(deleteSessionTarget.id);
      setSessions((prev) => prev.filter((s) => s.id !== deleteSessionTarget.id));
      setDeleteSessionTarget(null);
    } catch (e) { setSessionsError(e instanceof Error ? e.message : "Failed to delete session"); setDeleteSessionTarget(null); }
    finally { setDeleteSessionLoading(false); }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const subjectMap = Object.fromEntries(subjects.map((s) => [s.id, s.name]));
  const subjectOptions = subjects.map((s) => ({ value: s.id, label: s.name }));

  return (
    <div className="min-h-screen bg-slate-950 font-sans antialiased flex">

      {/* ── Sidebar ── */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col w-72 bg-slate-950/80 border-r border-white/5
                         backdrop-blur-2xl transition-transform duration-300 shadow-2xl
                         ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        {/* Background glow for sidebar */}
        <div className="absolute top-0 left-0 w-full h-64 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="h-20 flex items-center px-6 border-b border-white/5 flex-shrink-0">
          <button onClick={onGoToHome} className="flex items-center gap-2 cursor-pointer select-none group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            </div>
            <span className="text-white font-extrabold text-xl tracking-tighter">
              Study<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Buddy</span>
            </span>
          </button>
        </div>

        {/* User Profile & XP */}
        <div className="px-6 py-6 border-b border-white/5 flex-shrink-0 flex items-center gap-4">
          <div className="relative w-12 h-12 flex-shrink-0">
            {/* XP Ring */}
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path className="text-white/5" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="100, 100" />
              <path className="text-indigo-500 drop-shadow-[0_0_4px_rgba(99,102,241,0.5)] transition-all duration-1000" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="65, 100" strokeLinecap="round" />
            </svg>
            <div className="absolute inset-1 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border border-white/10">
              {/* Avatar placeholder */}
              <div className="w-full h-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center">
                <span className="text-indigo-200 font-bold text-sm">
                  {(userProfile?.first_name || userProfile?.username || userProfile?.email || "U").charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm truncate">
              {userProfile?.first_name
                ? `${userProfile.first_name}${userProfile.last_name ? " " + userProfile.last_name : ""}`
                : userProfile?.username || userProfile?.email || "Scholar"}
            </p>
            <p className="text-xs text-indigo-400 font-medium">Lvl 12 • 65% to next</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 overflow-y-auto w-full">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest px-3 mb-4">Core Navigation</p>
          <div className="flex flex-col gap-1.5 w-full">
            {navItems.map((item) => {
              const isActive = section === item.id;
              return (
                <button key={item.id} onClick={() => { setSection(item.id); setSidebarOpen(false); }}
                  className={`relative flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all w-full text-left group overflow-hidden
                              ${isActive ? "text-white" : "text-gray-400 hover:text-white hover:bg-white/[0.04]"}`}>
                  {isActive && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-violet-500/5 opacity-100" />
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                    </>
                  )}
                  <div className={`relative z-10 flex items-center justify-center transition-colors ${isActive ? "text-indigo-400 drop-shadow-[0_0_5px_rgba(99,102,241,0.5)]" : "text-gray-500 group-hover:text-gray-300"}`}>
                    {item.icon}
                  </div>
                  <span className="relative z-10">{item.label}</span>
                  {isActive && (
                    <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Daily Streak & Sign Out */}
        <div className="p-5 border-t border-white/5 flex-shrink-0 flex flex-col gap-4">
          <div className="flex items-center justify-between px-3 py-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-white text-xs font-bold leading-none">5 Day Streak</p>
                <p className="text-[10px] text-amber-400/80 mt-1">You're on fire!</p>
              </div>
            </div>
          </div>

          <button onClick={onSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                       text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ── Main ── */}
      <div className="flex-1 lg:ml-72 flex flex-col min-h-screen relative overflow-hidden">
        {/* Ambient background glow for main content */}
        <div className="absolute top-0 right-0 w-[800px] h-[600px] bg-indigo-600/5 rounded-full blur-[100px] pointer-events-none -z-10" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[400px] bg-violet-600/5 rounded-full blur-[100px] pointer-events-none -z-10" />

        {/* Top bar */}
        <header className="sticky top-0 z-20 h-20 bg-slate-950/60 backdrop-blur-2xl border-b border-white/5 flex items-center px-8 gap-4 shadow-sm">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-400 hover:text-white p-1 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-white font-bold text-lg">{navItems.find((n) => n.id === section)?.label ?? "Dashboard"}</h1>
          </div>
          {section === "subjects" && (
            <button onClick={openCreateSubject}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              New Subject
            </button>
          )}
          {section === "notes" && (
            <button onClick={openCreateNote}
              className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              New Note
            </button>
          )}
          {section === "sessions" && (
            <button onClick={openCreateSession}
              className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              New Session
            </button>
          )}
        </header>

        {/* Content */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">

          {/* ── Overview ── */}
          {section === "overview" && (
            <OverviewSection
              dashMain={dashMain}
              dashStats={dashStats}
              dashLastSession={dashLastSession}
              dashFlashcards={dashFlashcards}
              dashQuiz={dashQuiz}
              dashCollab={dashCollab}
              dashLoading={dashLoading}
              onCreateSubject={openCreateSubject}
              onCreateNote={openCreateNote}
              onCreateSession={openCreateSession}
              onDismissRec={async (id: string) => {
                await dismissRecommendation(id);
                setDashMain(prev => prev ? { ...prev, recommendations: prev.recommendations.filter(r => r.id !== id) } : prev);
              }}
            />
          )}

          {/* ── Subjects ── */}
          {section === "subjects" && (
            <div className="flex flex-col gap-6">
              {subjectsError && (
                <div className="rounded-2xl bg-red-500/10 border border-red-400/20 px-5 py-4 text-sm text-red-300 flex items-center justify-between">
                  {subjectsError}<button onClick={() => setSubjectsError(null)} className="text-red-400 hover:text-red-200 ml-4">✕</button>
                </div>
              )}
              <p className="text-gray-500 text-sm">{subjectsLoading ? "Loading…" : `${subjects.length} subject${subjects.length !== 1 ? "s" : ""}`}</p>
              {subjectsLoading && <SkeletonGrid cols={4} />}
              {!subjectsLoading && subjects.length === 0 && (
                <div className="flex flex-col items-center gap-6 py-32 text-center">
                  <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-400/15 flex items-center justify-center">
                    <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-bold text-xl">No subjects yet</p>
                    <p className="text-gray-500 text-sm mt-1">Create your first to get started</p>
                  </div>
                  <button onClick={openCreateSubject} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-bold transition-colors">Create Subject</button>
                </div>
              )}
              {!subjectsLoading && subjects.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {subjects.map((s) => <SubjectCard key={s.id} subject={s} onRename={openRenameSubject} onDelete={setDeleteSubjectTarget} />)}
                </div>
              )}
            </div>
          )}

          {/* ── Notes ── */}
          {section === "notes" && (
            <div className="flex flex-col gap-6">
              {notesError && (
                <div className="rounded-2xl bg-red-500/10 border border-red-400/20 px-5 py-4 text-sm text-red-300 flex items-center justify-between">
                  {notesError}<button onClick={() => setNotesError(null)} className="text-red-400 hover:text-red-200 ml-4">✕</button>
                </div>
              )}
              <p className="text-gray-500 text-sm">{notesLoading ? "Loading…" : `${notes.length} note${notes.length !== 1 ? "s" : ""}`}</p>
              {notesLoading && <SkeletonGrid />}
              {!notesLoading && notes.length === 0 && (
                <div className="flex flex-col items-center gap-6 py-32 text-center">
                  <div className="w-20 h-20 rounded-2xl bg-violet-500/10 border border-violet-400/15 flex items-center justify-center">
                    <svg className="w-10 h-10 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-bold text-xl">No notes yet</p>
                    <p className="text-gray-500 text-sm mt-1">Write your first note to start capturing ideas</p>
                  </div>
                  <button onClick={openCreateNote} className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-2xl font-bold transition-colors">Write a Note</button>
                </div>
              )}
              {!notesLoading && notes.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {notes.map((n) => (
                    <NoteCard key={n.id} note={n}
                      subjectName={n.study_subject_id ? subjectMap[n.study_subject_id] : undefined}
                      onEdit={openEditNote} onDelete={setDeleteNoteTarget} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Sessions ── */}
          {section === "sessions" && (
            <div className="flex flex-col gap-6">
              {sessionsError && (
                <div className="rounded-2xl bg-red-500/10 border border-red-400/20 px-5 py-4 text-sm text-red-300 flex items-center justify-between">
                  {sessionsError}<button onClick={() => setSessionsError(null)} className="text-red-400 hover:text-red-200 ml-4">✕</button>
                </div>
              )}
              <p className="text-gray-500 text-sm">{sessionsLoading ? "Loading…" : `${sessions.length} session${sessions.length !== 1 ? "s" : ""}`}</p>
              {sessionsLoading && <SkeletonGrid />}
              {!sessionsLoading && sessions.length === 0 && (
                <div className="flex flex-col items-center gap-6 py-32 text-center">
                  <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-400/15 flex items-center justify-center">
                    <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-bold text-xl">No sessions yet</p>
                    <p className="text-gray-500 text-sm mt-1">Start your first study session to track your progress</p>
                  </div>
                  <button onClick={openCreateSession} className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-2xl font-bold transition-colors">Start a Session</button>
                </div>
              )}
              {!sessionsLoading && sessions.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sessions.map((s) => (
                    <SessionCard key={s.id} session={s}
                      subjectName={s.study_subject_id ? subjectMap[s.study_subject_id] : undefined}
                      onStatusChange={handleSessionStatusChange} onDelete={setDeleteSessionTarget} />
                  ))}
                </div>
              )}
            </div>
          )}
          {section === "settings" && <SettingsSection dashMain={dashMain} userProfile={userProfile} />}
        </main>
      </div >

      {/* ── Modals ── */}

      {/* Create subject */}
      {
        showCreateSubject && (
          <Modal title="New Subject" onClose={() => setShowCreateSubject(false)}>
            <form onSubmit={handleCreateSubject} className="flex flex-col gap-5">
              <TextInput label="Subject name" value={createSubjectName} onChange={setCreateSubjectName}
                placeholder="e.g. Calculus, History, Python…" inputRef={createSubjectRef} />
              {createSubjectError && <p className="text-sm text-red-400">{createSubjectError}</p>}
              <ModalActions onCancel={() => setShowCreateSubject(false)} submitLabel="Create"
                loading={createSubjectLoading} disabled={!createSubjectName.trim()} />
            </form>
          </Modal>
        )
      }

      {/* Rename subject */}
      {
        renameSubject && (
          <Modal title="Rename Subject" onClose={() => setRenameSubject(null)}>
            <form onSubmit={handleRenameSubject} className="flex flex-col gap-5">
              <TextInput label="New name" value={renameName} onChange={setRenameName} inputRef={renameInputRef} />
              {renameError && <p className="text-sm text-red-400">{renameError}</p>}
              <ModalActions onCancel={() => setRenameSubject(null)} submitLabel="Save"
                loading={renameLoading} disabled={!renameName.trim()} />
            </form>
          </Modal>
        )
      }

      {/* Delete subject */}
      {
        deleteSubjectTarget && (
          <Modal title="Delete Subject" onClose={() => setDeleteSubjectTarget(null)}>
            <form onSubmit={(e) => { e.preventDefault(); handleDeleteSubject(); }} className="flex flex-col gap-6">
              <p className="text-gray-400 text-sm leading-relaxed">
                Delete <span className="text-white font-semibold">"{deleteSubjectTarget.name}"</span>? This cannot be undone.
              </p>
              <ModalActions onCancel={() => setDeleteSubjectTarget(null)} submitLabel="Delete" loading={deleteSubjectLoading} danger />
            </form>
          </Modal>
        )
      }

      {/* Create / Edit note */}
      {
        (showCreateNote || editNote) && (
          <Modal title={editNote ? "Edit Note" : "New Note"} onClose={() => { setShowCreateNote(false); setEditNote(null); }}>
            <form onSubmit={editNote ? handleUpdateNote : handleCreateNote} className="flex flex-col gap-5">
              <TextInput label="Title" value={noteTitle} onChange={setNoteTitle}
                placeholder="Note title…" inputRef={noteTitleRef} />
              <TextAreaInput label="Content (optional)" value={noteContent} onChange={setNoteContent}
                placeholder="Write your note here…" />
              {subjects.length > 0 && (
                <SelectInput label="Subject (optional)" value={noteSubjectId} onChange={setNoteSubjectId} options={subjectOptions} />
              )}
              {noteFormError && <p className="text-sm text-red-400">{noteFormError}</p>}
              <ModalActions onCancel={() => { setShowCreateNote(false); setEditNote(null); }}
                submitLabel={editNote ? "Save" : "Create"} loading={noteFormLoading} disabled={!noteTitle.trim()} />
            </form>
          </Modal>
        )
      }

      {/* Delete note */}
      {
        deleteNoteTarget && (
          <Modal title="Delete Note" onClose={() => setDeleteNoteTarget(null)}>
            <form onSubmit={(e) => { e.preventDefault(); handleDeleteNote(); }} className="flex flex-col gap-6">
              <p className="text-gray-400 text-sm leading-relaxed">
                Delete <span className="text-white font-semibold">"{deleteNoteTarget.title}"</span>? This cannot be undone.
              </p>
              <ModalActions onCancel={() => setDeleteNoteTarget(null)} submitLabel="Delete" loading={deleteNoteLoading} danger />
            </form>
          </Modal>
        )
      }

      {/* Create session */}
      {
        showCreateSession && (
          <Modal title="New Study Session" onClose={() => setShowCreateSession(false)}>
            <form onSubmit={handleCreateSession} className="flex flex-col gap-5">
              <TextInput label="Title (optional)" value={sessionTitle} onChange={setSessionTitle}
                placeholder="e.g. Chapter 3 Review…" required={false} />
              <SelectInput label="Session type" value={sessionType} onChange={setSessionType} required
                options={[
                  { value: "solo", label: "Solo" },
                  { value: "group", label: "Group" },
                  { value: "exam_prep", label: "Exam Prep" },
                  { value: "review", label: "Review" },
                  { value: "practice", label: "Practice" },
                ]} />
              {subjects.length > 0 && (
                <SelectInput label="Subject (optional)" value={sessionSubjectId} onChange={setSessionSubjectId} options={subjectOptions} />
              )}
              <SelectInput label="Intention (optional)" value={sessionIntentionType} onChange={setSessionIntentionType}
                options={[
                  { value: "review", label: "Review" },
                  { value: "learn_new", label: "Learn new material" },
                  { value: "practice", label: "Practice" },
                  { value: "exam_prep", label: "Exam preparation" },
                  { value: "other", label: "Other" },
                ]} />
              <TextAreaInput label="Intention details (optional)" value={sessionIntentionText}
                onChange={setSessionIntentionText} placeholder="What do you want to achieve in this session?" />
              {sessionFormError && <p className="text-sm text-red-400">{sessionFormError}</p>}
              <ModalActions onCancel={() => setShowCreateSession(false)} submitLabel="Start Session" loading={sessionFormLoading} />
            </form>
          </Modal>
        )
      }

      {/* Delete session */}
      {
        deleteSessionTarget && (
          <Modal title="Delete Session" onClose={() => setDeleteSessionTarget(null)}>
            <form onSubmit={(e) => { e.preventDefault(); handleDeleteSession(); }} className="flex flex-col gap-6">
              <p className="text-gray-400 text-sm leading-relaxed">
                Delete <span className="text-white font-semibold">"{deleteSessionTarget.title || "Untitled Session"}"</span>? This cannot be undone.
              </p>
              <ModalActions onCancel={() => setDeleteSessionTarget(null)} submitLabel="Delete" loading={deleteSessionLoading} danger />
            </form>
          </Modal>
        )
      }
    </div >
  );
}
