import { useEffect, useState, useRef } from "react";
import { getSubjects, createSubject, updateSubject, deleteSubject, type Subject } from "../api/subjects";
import { getNotes, createNote, updateNote, deleteNote, type Note } from "../api/notes";
import SessionsSection, { type SessionsSectionHandle } from "./SessionsSection";
import FlashcardsSection from "./FlashcardsSection";
import QuizzesSection from "./QuizzesSection";
import DocumentsSection from "./DocumentsSection";
import GoalsSection from "./GoalsSection";
import GroupsSection from "./GroupsSection";
import OverviewSection from "./OverviewSection";
import SettingsSection from "./SettingsSection";
import Modal from "../components/ui/Modal";
import SubjectCard from "../components/subjects/SubjectCard";
import NoteCard from "../components/notes/NoteCard";
import SkeletonGrid from "../components/ui/SkeletonGrid";


interface Props {
  initialSection?: string;
  onSignOut: () => void;
  onGoToHome?: () => void;
}

// ── Dashboard types ─────────────────────────────────────────────────────────────
type DashSection = "overview" | "subjects" | "library" | "goals" | "groups" | "settings";

// ── Types ──────────────────────────────────────────────────────────────────────
type Section = DashSection;

const sectionToPath: Record<Section, string> = {
  overview:  "/dashboard",
  subjects:  "/subjects",
  library:   "/library",
  goals:     "/goals",
  groups:    "/groups",
  settings:  "/settings",
};

type LibraryTab = "documents" | "notes" | "flashcards" | "quizzes";

const libraryTabs: { id: LibraryTab; label: string; icon: React.ReactNode; accent: string }[] = [
  { id: "documents",  label: "Documents",  accent: "text-cyan-400",
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
  { id: "notes",      label: "Notes",      accent: "text-violet-400",
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg> },
  { id: "flashcards", label: "Flashcards", accent: "text-emerald-400",
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> },
  { id: "quizzes",    label: "Quizzes",    accent: "text-amber-400",
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> },
];

// ── Nav items ──────────────────────────────────────────────────────────────────
const mainNavItems: { id: Section; label: string; icon: React.ReactNode }[] = [
  {
    id: "overview", label: "Dashboard",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  },
  {
    id: "subjects", label: "Subjects",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
  },
  {
    id: "library", label: "Library",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>,
  },
  {
    id: "goals", label: "Missions",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  },
  {
    id: "groups", label: "Study Groups",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  },
];

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

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function DashboardPage({ initialSection, onSignOut }: Props) {
  const coerceSection = (s: string | undefined): Section => {
    const valid: Section[] = ["overview", "subjects", "library", "goals", "groups", "settings"];
    return valid.includes(s as Section) ? (s as Section) : "overview";
  };
  const [section, setSection] = useState<Section>(coerceSection(initialSection));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(() => {
    const match = window.location.pathname.match(/^\/subjects\/([0-9a-f-]{36})$/i);
    return match ? match[1] : null;
  });

  // ── Section navigation with URL sync ────────────────────────────────────────
  function nav(s: Section, opts?: { closePalette?: boolean }) {
    setSection(s);
    setSelectedSubjectId(null);
    setSidebarOpen(false);
    if (opts?.closePalette) setShowCmdPalette(false);
    window.history.pushState({ section: s }, "", sectionToPath[s]);
  }

  function navToSubject(id: string | null) {
    setSelectedSubjectId(id);
    setSection("subjects");
    setSidebarOpen(false);
    setShowCmdPalette(false);
    if (id) {
      window.history.pushState({ section: "subjects", subjectId: id }, "", `/subjects/${id}`);
    } else {
      window.history.pushState({ section: "subjects" }, "", "/subjects");
    }
  }

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

  // ── Library state ────────────────────────────────────────────────────────────
  const [libraryTab, setLibraryTab] = useState<LibraryTab>("documents");
  const [librarySubjectFilter, setLibrarySubjectFilter] = useState("");

  // ── Sessions section ref ─────────────────────────────────────────────────────
  const sessionsSectionRef = useRef<SessionsSectionHandle>(null);

  // ── Dashboard widget state ───────────────────────────────────────────────────
  const [hasActiveSession, setHasActiveSession] = useState(() => !!localStorage.getItem("sb_active_timer"));
  const [activeSessionTitle, setActiveSessionTitle] = useState<string>(() => {
    try {
      const raw = localStorage.getItem("sb_active_timer");
      if (!raw) return "";
      const t = JSON.parse(raw);
      return t.title || "";
    } catch { return ""; }
  });
  const [activeSessionSubjectId, setActiveSessionSubjectId] = useState<string | null>(() => {
    try {
      const raw = localStorage.getItem("sb_active_timer");
      if (!raw) return null;
      return JSON.parse(raw).subjectId ?? null;
    } catch { return null; }
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCmdPalette, setShowCmdPalette] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");

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

  useEffect(() => { loadSubjects(); loadNotes(); }, []);

  useEffect(() => {
    function onSessionChanged(e: Event) {
      const d = (e as CustomEvent).detail;
      setHasActiveSession(d.hasActive);
      if (d.hasActive) {
        if (d.title) setActiveSessionTitle(d.title);
        setActiveSessionSubjectId(d.subjectId ?? null);
      } else {
        setActiveSessionTitle("");
        setActiveSessionSubjectId(null);
      }
    }
    window.addEventListener("sb-session-changed", onSessionChanged);
    return () => window.removeEventListener("sb-session-changed", onSessionChanged);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdQuery("");
        setShowCmdPalette(true);
      }
      if (e.key === "Escape") {
        setShowNotifications(false);
        setShowCmdPalette(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    function onPop() {
      const p = window.location.pathname;
      const subjectMatch = p.match(/^\/subjects\/([0-9a-f-]{36})$/i);
      if (subjectMatch) {
        setSection("subjects");
        setSelectedSubjectId(subjectMatch[1]);
        return;
      }
      setSelectedSubjectId(null);
      const s = (() => {
        for (const [sec, path] of Object.entries(sectionToPath)) {
          if (p === path) return sec as Section;
        }
        return "overview" as Section;
      })();
      setSection(s);
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // ── Subject handlers ────────────────────────────────────────────────────────
  async function handleCreateSubject(e: React.FormEvent) {
    e.preventDefault();
    if (!createSubjectName.trim()) return;
    setCreateSubjectLoading(true); setCreateSubjectError(null);
    try {
      const s = await createSubject({ name: createSubjectName.trim() });
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
      const updated = await updateSubject(renameSubject.id, { name: renameName.trim() });
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
    setEditNote(n); setNoteTitle(n.title ?? ""); setNoteContent(n.content ?? "");
    setNoteSubjectId(n.subject_id ?? ""); setNoteFormError(null);
  }

  async function handleCreateNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteTitle.trim()) return;
    setNoteFormLoading(true); setNoteFormError(null);
    try {
      const n = await createNote({
        title: noteTitle.trim() || undefined,
        content: noteContent.trim(),
        subject_id: (noteSubjectId || subjects[0]?.id) ?? "",
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
        title: noteTitle.trim() || undefined,
        content: noteContent.trim() || undefined,
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

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const subjectMap = Object.fromEntries(subjects.map((s) => [s.id, s.name]));
  const subjectOptions = subjects.map((s) => ({ value: s.id, label: s.name }));

  return (
    <div className="min-h-screen bg-slate-950 font-sans antialiased">

      {/* ── Main ── */}
      <div className="flex flex-col min-h-screen relative overflow-hidden pt-16">
        {/* Ambient background glow for main content */}
        <div className="absolute top-0 right-0 w-[800px] h-[600px] bg-indigo-600/5 rounded-full blur-[100px] pointer-events-none -z-10" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[400px] bg-violet-600/5 rounded-full blur-[100px] pointer-events-none -z-10" />

        {/* Top bar — fixed, spans full viewport width */}
        <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-slate-950/80 backdrop-blur-2xl border-b border-white/5 flex items-center px-6 gap-4 shadow-sm">

          {/* Mobile menu toggle */}
          <button onClick={() => setSidebarOpen(o => !o)} className="md:hidden text-gray-400 hover:text-white p-1 transition-colors flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Logo + Brand */}
          <button
            onClick={() => nav("overview")}
            className="flex items-center gap-2.5 cursor-pointer select-none flex-shrink-0 group"
          >
            <img src="/assets/Logomark_final3.svg" alt="StudyBuddy" className="w-7 h-7 group-hover:scale-105 transition-transform duration-200" />
            <span className="text-white font-extrabold text-lg tracking-tighter hidden sm:block">
              Study<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Buddy</span>
            </span>
          </button>

          {/* Nav links — desktop */}
          <nav className="hidden md:flex items-center gap-0.5 flex-shrink-0">
            {(
              [
                { id: "overview", label: "Home"     },
                { id: "subjects", label: "Subjects"  },
                { id: "library",  label: "Library"   },
                { id: "goals",    label: "Missions"  },
                { id: "groups",   label: "Groups"    },
              ] as { id: Section; label: string }[]
            ).map(item => (
              <button key={item.id}
                onClick={() => nav(item.id, { closePalette: true })}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  section === item.id
                    ? "bg-white/10 text-white"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}>
                {item.label}
              </button>
            ))}
          </nav>

          {/* Search — opens command palette */}
          <button
            onClick={() => { setCmdQuery(""); setShowCmdPalette(true); }}
            className="w-44 lg:w-64 hidden sm:flex items-center gap-2 bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 hover:border-white/20 hover:bg-white/[0.08] transition-all cursor-pointer text-left flex-shrink-0"
          >
            <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-sm text-gray-600 flex-1">Search…</span>
            <kbd className="hidden lg:inline text-[10px] text-gray-600 border border-white/10 rounded px-1.5 py-0.5 font-mono">⌘K</kbd>
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Context action buttons (right-aligned) */}
          {section === "subjects" && !selectedSubjectId && (
            <button onClick={openCreateSubject}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              New Subject
            </button>
          )}
          {section === "subjects" && selectedSubjectId && (
            <button onClick={() => sessionsSectionRef.current?.openCreate()}
              className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              New Session
            </button>
          )}
          {section === "library" && libraryTab === "notes" && (
            <button onClick={openCreateNote}
              className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              New Note
            </button>
          )}
          {section === "goals" && (
            <button onClick={() => nav("goals")}
              className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              New Goal
            </button>
          )}

          {/* Notifications */}
          <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>

          {/* Profile */}
          <button
            onClick={() => nav("settings")}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-white/[0.06] transition-all flex-shrink-0 group"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500/40 to-violet-500/40 border border-indigo-400/30 flex items-center justify-center flex-shrink-0">
              <span className="text-indigo-200 font-bold text-xs">S</span>
            </div>
            <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors hidden md:block max-w-[100px] truncate">
              Profile
            </span>
            <svg className="w-3.5 h-3.5 text-gray-600 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </header>

        {/* Mobile menu dropdown */}
        {sidebarOpen && (
          <div className="fixed top-16 left-0 right-0 z-40 bg-slate-950/98 border-b border-white/10 backdrop-blur-2xl py-3 px-4 flex flex-col gap-1 md:hidden shadow-2xl">
            {(
              [
                { id: "overview", label: "Home"     },
                { id: "subjects", label: "Subjects"  },
                { id: "library",  label: "Library"   },
                { id: "goals",    label: "Missions"  },
                { id: "groups",   label: "Groups"    },
                { id: "settings", label: "Settings"  },
              ] as { id: Section; label: string }[]
            ).map(item => (
              <button key={item.id}
                onClick={() => { nav(item.id, { closePalette: true }); setSidebarOpen(false); }}
                className={`text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  section === item.id ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}>
                {item.label}
              </button>
            ))}
            <div className="h-px bg-white/5 my-1" />
            <button onClick={onSignOut} className="text-left px-4 py-3 rounded-xl text-sm font-semibold text-gray-500 hover:text-red-400 hover:bg-red-500/5 transition-all">
              Sign Out
            </button>
          </div>
        )}

        {/* Content */}
        <main className={section === "overview" ? "flex-1 w-full" : "flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto"}>

          {/* ── Active session banner ── */}
          {hasActiveSession && !(section === "subjects" && !!selectedSubjectId) && (
            <div className="mb-6 flex items-center gap-3 px-5 py-3 bg-emerald-950/60 border border-emerald-500/25 rounded-2xl">
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse flex-shrink-0" />
              <span className="text-emerald-300 text-sm font-semibold flex-shrink-0">Workspace in progress</span>
              {activeSessionTitle && (
                <span className="text-emerald-200/50 text-sm truncate hidden sm:block">— {activeSessionTitle}</span>
              )}
              <div className="flex-1" />
              <button
                onClick={() => activeSessionSubjectId ? navToSubject(activeSessionSubjectId) : nav("subjects")}
                className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors flex-shrink-0"
              >
                Go to Workspace
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          )}

          {/* ── Overview ── */}
          {section === "overview" && (
            <OverviewSection onNavigate={(s) => nav(s as Section)} />
          )}

          {/* ── Subjects: list ── */}
          {section === "subjects" && !selectedSubjectId && (
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="text-3xl font-bold text-amber-400">Academic Subjects</h1>
                <p className="text-gray-400 text-sm mt-1">Manage and access all your study materials, powered by AI.</p>
              </div>
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
                    <p className="text-gray-500 text-sm mt-1">Create your first subject to start organizing sessions</p>
                  </div>
                  <button onClick={openCreateSubject} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-bold transition-colors">Create Subject</button>
                </div>
              )}
              {!subjectsLoading && subjects.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {subjects.map((s, i) => (
                    <SubjectCard
                      key={s.id}
                      subject={s}
                      index={i}
                      onRename={openRenameSubject}
                      onDelete={(s) => setDeleteSubjectTarget(s)}
                      onClick={(s) => navToSubject(s.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Subjects: detail (sessions for this subject) ── */}
          {section === "subjects" && selectedSubjectId && (() => {
            const subject = subjects.find(s => s.id === selectedSubjectId);
            return (
              <div className="flex flex-col gap-6">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navToSubject(null)}
                    className="flex items-center gap-1.5 text-gray-500 hover:text-white text-sm font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Subjects
                  </button>
                  <span className="text-gray-700">/</span>
                  <span className="text-white font-semibold text-sm">
                    {subject?.name ?? (subjectsLoading ? "…" : "Subject")}
                  </span>
                </div>

                {/* Subject header */}
                {subject && (
                  <div className="flex items-center gap-4 p-5 bg-white/[0.03] border border-white/[0.06] rounded-2xl">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-400/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-lg leading-tight">{subject.name}</p>
                    </div>
                    <button
                      onClick={() => openRenameSubject(subject)}
                      className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
                      title="Rename subject"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                )}

                {/* Sessions for this subject */}
                <SessionsSection ref={sessionsSectionRef} subjects={subjects} subjectId={selectedSubjectId} />
              </div>
            );
          })()}

          {/* ── Library ── */}
          {section === "library" && (
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="text-3xl font-bold text-cyan-400">Study Library</h1>
                <p className="text-gray-400 text-sm mt-1">All your study materials in one place — organized by subject.</p>
              </div>

              {/* Tab bar + subject filter */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-1 p-1 bg-white/[0.04] border border-white/[0.07] rounded-2xl">
                  {libraryTabs.map((tab) => {
                    const active = libraryTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setLibraryTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all
                          ${active ? "bg-white/[0.10] text-white shadow-sm" : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"}`}
                      >
                        <span className={active ? tab.accent : "text-gray-600"}>{tab.icon}</span>
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
                {subjects.length > 0 && (
                  <select
                    value={librarySubjectFilter}
                    onChange={(e) => setLibrarySubjectFilter(e.target.value)}
                    className="bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50 transition [&>option]:bg-slate-800"
                  >
                    <option value="">All Subjects</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                )}
              </div>

              {/* Documents tab */}
              {libraryTab === "documents" && <DocumentsSection />}

              {/* Notes tab */}
              {libraryTab === "notes" && (
                <div className="flex flex-col gap-6">
                  {notesError && (
                    <div className="rounded-2xl bg-red-500/10 border border-red-400/20 px-5 py-4 text-sm text-red-300 flex items-center justify-between">
                      {notesError}<button onClick={() => setNotesError(null)} className="text-red-400 hover:text-red-200 ml-4">✕</button>
                    </div>
                  )}
                  <p className="text-gray-500 text-sm">{notesLoading ? "Loading…" : `${notes.filter(n => !librarySubjectFilter || n.subject_id === librarySubjectFilter).length} note${notes.filter(n => !librarySubjectFilter || n.subject_id === librarySubjectFilter).length !== 1 ? "s" : ""}`}</p>
                  {notesLoading && <SkeletonGrid />}
                  {!notesLoading && notes.filter(n => !librarySubjectFilter || n.subject_id === librarySubjectFilter).length === 0 && (
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
                  {!notesLoading && notes.filter(n => !librarySubjectFilter || n.subject_id === librarySubjectFilter).length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {notes.filter(n => !librarySubjectFilter || n.subject_id === librarySubjectFilter).map((n) => (
                        <NoteCard key={n.id} note={n}
                          subjectName={n.subject_id ? subjectMap[n.subject_id] : undefined}
                          onEdit={openEditNote} onDelete={(n) => setDeleteNoteTarget(n)} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Flashcards tab */}
              {libraryTab === "flashcards" && <FlashcardsSection />}

              {/* Quizzes tab */}
              {libraryTab === "quizzes" && <QuizzesSection />}
            </div>
          )}

          {/* ── Goals ── */}
          {section === "goals" && <GoalsSection />}

          {/* ── Study Groups ── */}
          {section === "groups" && <GroupsSection currentUserId="" />}

          {section === "settings" && <SettingsSection />}
        </main>
      </div >

      {/* ── Notifications panel ── */}
      {showNotifications && (
        <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}>
          <div
            className="absolute top-16 right-4 w-96 max-w-[calc(100vw-2rem)] bg-slate-900/98 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <div>
                <p className="text-sm font-bold text-white">Notifications</p>
                <p className="text-xs text-gray-500 mt-0.5">0 active</p>
              </div>
              <button onClick={() => setShowNotifications(false)} className="text-gray-600 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              <div className="flex flex-col items-center gap-3 py-10 px-6 text-center">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm font-medium">You're all caught up!</p>
                <p className="text-gray-600 text-xs">No new recommendations right now.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Command palette ── */}
      {showCmdPalette && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowCmdPalette(false)}
        >
          <div
            className="w-full max-w-xl bg-slate-900/98 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5">
              <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                autoFocus
                type="text"
                value={cmdQuery}
                onChange={(e) => setCmdQuery(e.target.value)}
                placeholder="Search workspaces, notes, subjects…"
                className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-500 outline-none"
              />
              <kbd className="text-[10px] text-gray-600 border border-white/10 rounded px-1.5 py-0.5 font-mono flex-shrink-0">ESC</kbd>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {/* Notes */}
              {(() => {
                const results = notes.filter(
                  (n) =>
                    !cmdQuery ||
                    (n.title ?? "").toLowerCase().includes(cmdQuery.toLowerCase()) ||
                    n.content?.toLowerCase().includes(cmdQuery.toLowerCase())
                ).slice(0, 4);
                if (results.length === 0) return null;
                return (
                  <>
                    <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Notes</p>
                    {results.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => { setLibraryTab("notes"); nav("library", { closePalette: true }); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.05] text-left transition-colors"
                      >
                        <div className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                          <svg className="w-3.5 h-3.5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium truncate">{n.title ?? "Untitled"}</p>
                          <p className="text-gray-600 text-xs truncate">{n.content ? n.content.slice(0, 40) : "No content"}</p>
                        </div>
                      </button>
                    ))}
                  </>
                );
              })()}

              {/* Subjects */}
              {(() => {
                const results = subjects.filter(
                  (s) => !cmdQuery || s.name.toLowerCase().includes(cmdQuery.toLowerCase())
                ).slice(0, 3);
                if (results.length === 0) return null;
                return (
                  <>
                    <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Subjects</p>
                    {results.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => { navToSubject(s.id); setShowCmdPalette(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.05] text-left transition-colors"
                      >
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
                          <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium truncate">{s.name}</p>
                          <p className="text-gray-600 text-xs">Subject</p>
                        </div>
                      </button>
                    ))}
                  </>
                );
              })()}

              {/* Nav shortcuts (shown when no query) */}
              {!cmdQuery && (
                <div className="px-4 pt-3 pb-3">
                  <p className="pb-1 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Go to</p>
                  <div className="grid grid-cols-2 gap-1">
                    {mainNavItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => nav(item.id, { closePalette: true })}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/[0.05] text-gray-400 hover:text-white transition-colors text-left"
                      >
                        <div className="w-4 h-4 flex-shrink-0 opacity-70">{item.icon}</div>
                        <span className="text-xs">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty search result */}
              {cmdQuery &&
                notes.filter((n) => (n.title ?? "").toLowerCase().includes(cmdQuery.toLowerCase())).length === 0 &&
                subjects.filter((s) => s.name.toLowerCase().includes(cmdQuery.toLowerCase())).length === 0 && (
                  <div className="py-10 text-center">
                    <p className="text-gray-500 text-sm">No results for "{cmdQuery}"</p>
                    <p className="text-gray-600 text-xs mt-1">Try searching for a workspace title or note name</p>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

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
                Delete <span className="text-white font-semibold">"{deleteNoteTarget.title ?? "Untitled"}"</span>? This cannot be undone.
              </p>
              <ModalActions onCancel={() => setDeleteNoteTarget(null)} submitLabel="Delete" loading={deleteNoteLoading} danger />
            </form>
          </Modal>
        )
      }

    </div >
  );
}
