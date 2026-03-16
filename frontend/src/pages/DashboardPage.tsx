import { useEffect, useState, useRef } from "react";
import { getSubjects, createSubject, updateSubject, deleteSubject, type Subject } from "../api/subjects";
import { getNotes, createNote, updateNote, deleteNote, type Note } from "../api/notes";
import SessionsSection, { type SessionsSectionHandle } from "./SessionsSection";
import FlashcardsSection from "./FlashcardsSection";
import QuizzesSection from "./QuizzesSection";
import DocumentsSection from "./DocumentsSection";
import GoalsSection, { type GoalsSectionHandle } from "./GoalsSection";
import GroupsSection from "./GroupsSection";
import {
  getMainDashboard, getDashboardStats, getLastSession, getFlashcardsDue,
  getQuizPerformance, getCollaboration, dismissRecommendation, getCurrentUser,
  type MainDashboard, type DashboardStats, type StudySession as DashSession,
  type FlashcardDue, type StudyGroup, type UserProfile, type ProgressSnapshot,
} from "../api/dashboard";

function computeLevel(snapshots: ProgressSnapshot[]): { level: number; pct: number } {
  const totalMins = snapshots
    .filter(s => s.snapshot_type === "daily")
    .reduce((sum, s) => sum + s.total_study_minutes, 0);
  const minsPerLevel = 60;
  const level = Math.floor(totalMins / minsPerLevel) + 1;
  const pct = Math.round((totalMins % minsPerLevel) / minsPerLevel * 100);
  return { level, pct };
}

function computeStreak(snapshots: ProgressSnapshot[]): number {
  const activeDays = new Set(
    snapshots
      .filter(s => s.snapshot_type === "daily" && s.sessions_completed > 0)
      .map(s => s.snapshot_date.slice(0, 10))
  );
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (activeDays.has(key)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}
import OverviewSection from "./OverviewSection";
interface Props {
  initialSection?: Section;
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
type Section = "overview" | "subjects" | "library" | "goals" | "groups" | "settings";

const sectionToPath: Record<Section, string> = {
  overview:  "/dashboard",
  subjects:  "/subjects",
  library:   "/library",
  goals:     "/goals",
  groups:    "/groups",
  settings:  "/settings",
};

const SUBJECT_SECTIONS: Section[] = ["subjects"];

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
    id: "goals", label: "Goals",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  },
  {
    id: "groups", label: "Study Groups",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  },
];

// Coming-soon placeholder
function ComingSoon({ label, icon, accent = "indigo" }: { label: string; icon: React.ReactNode; accent?: string }) {
  const colors: Record<string, { bg: string; border: string; text: string; badge: string; badgeBorder: string }> = {
    indigo:  { bg: "bg-indigo-500/10",  border: "border-indigo-400/15",  text: "text-indigo-400",  badge: "bg-indigo-500/10",  badgeBorder: "border-indigo-500/20"  },
    violet:  { bg: "bg-violet-500/10",  border: "border-violet-400/15",  text: "text-violet-400",  badge: "bg-violet-500/10",  badgeBorder: "border-violet-500/20"  },
    emerald: { bg: "bg-emerald-500/10", border: "border-emerald-400/15", text: "text-emerald-400", badge: "bg-emerald-500/10", badgeBorder: "border-emerald-500/20" },
    amber:   { bg: "bg-amber-500/10",   border: "border-amber-400/15",   text: "text-amber-400",   badge: "bg-amber-500/10",   badgeBorder: "border-amber-500/20"   },
    cyan:    { bg: "bg-cyan-500/10",    border: "border-cyan-400/15",    text: "text-cyan-400",    badge: "bg-cyan-500/10",    badgeBorder: "border-cyan-500/20"    },
    rose:    { bg: "bg-rose-500/10",    border: "border-rose-400/15",    text: "text-rose-400",    badge: "bg-rose-500/10",    badgeBorder: "border-rose-500/20"    },
  };
  const c = colors[accent] ?? colors.indigo;
  return (
    <div className="flex flex-col items-center gap-6 py-32 text-center">
      <div className={`w-20 h-20 rounded-2xl ${c.bg} border ${c.border} flex items-center justify-center`}>
        <div className={c.text}>{icon}</div>
      </div>
      <div>
        <p className="text-white font-bold text-xl">{label}</p>
        <p className="text-gray-500 text-sm mt-1">This feature is coming soon.</p>
      </div>
      <span className={`text-xs px-3 py-1.5 rounded-full ${c.badge} ${c.text} border ${c.badgeBorder} font-semibold`}>
        Coming Soon
      </span>
    </div>
  );
}

// ── Subject Card ───────────────────────────────────────────────────────────────
const SUBJECT_ACCENT_COLORS = [
  { icon: "text-violet-400", iconBg: "bg-violet-500/15 border-violet-500/20", iconBgHover: "group-hover:border-violet-500/50", border: "hover:border-violet-500/60" },
  { icon: "text-indigo-400",  iconBg: "bg-indigo-500/15 border-indigo-500/20",  iconBgHover: "group-hover:border-indigo-500/50",  border: "hover:border-indigo-500/60"  },
  { icon: "text-cyan-400",    iconBg: "bg-cyan-500/15 border-cyan-500/20",      iconBgHover: "group-hover:border-cyan-500/50",    border: "hover:border-cyan-500/60"    },
  { icon: "text-emerald-400", iconBg: "bg-emerald-500/15 border-emerald-500/20",iconBgHover: "group-hover:border-emerald-500/50", border: "hover:border-emerald-500/60" },
  { icon: "text-amber-400",   iconBg: "bg-amber-500/15 border-amber-500/20",    iconBgHover: "group-hover:border-amber-500/50",   border: "hover:border-amber-500/60"   },
  { icon: "text-rose-400",    iconBg: "bg-rose-500/15 border-rose-500/20",      iconBgHover: "group-hover:border-rose-500/50",    border: "hover:border-rose-500/60"    },
];

const SUBJECT_ICONS = [
  // book
  <svg key="book" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
  // code
  <svg key="code" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>,
  // flask/beaker
  <svg key="flask" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 3h6m-6 0v7l-4 9a1 1 0 001 1h12a1 1 0 001-1l-4-9V3m-6 0h6M9 12h6" /></svg>,
  // chart
  <svg key="chart" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  // brain / lightbulb
  <svg key="bulb" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
  // scroll / history
  <svg key="scroll" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
];

function SubjectCard({ subject, onRename, onDelete, onClick, index = 0 }: {
  subject: Subject; onRename: (s: Subject) => void; onDelete: (s: Subject) => void; onClick?: (s: Subject) => void; index?: number;
}) {
  const accent = SUBJECT_ACCENT_COLORS[index % SUBJECT_ACCENT_COLORS.length];
  const icon = SUBJECT_ICONS[index % SUBJECT_ICONS.length];

  return (
    <div
      onClick={() => onClick?.(subject)}
      className={`group relative bg-slate-900/80 border border-white/[0.08] rounded-2xl p-6 flex flex-col
                   transition-all duration-200 ${accent.border}
                   ${onClick ? "cursor-pointer" : ""}`}
    >
      {/* Action buttons */}
      <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button onClick={(e) => { e.stopPropagation(); onRename(subject); }} title="Rename"
          className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(subject); }} title="Delete"
          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Icon + Name */}
      <div className="flex items-center gap-4 mb-6">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border ${accent.iconBg} ${accent.iconBgHover} transition-colors`}>
          <div className={accent.icon}>{icon}</div>
        </div>
        <h3 className="text-lg font-bold text-white leading-snug">{subject.name}</h3>
      </div>

      {/* Stats badges */}
      <div className="flex gap-3 mt-auto">
        <div className="flex-1 py-2.5 px-2 rounded-xl bg-white/[0.04] border border-white/[0.07] flex flex-col items-center gap-1">
          <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[11px] text-gray-500 leading-none">
            <strong className="text-white font-bold">{subject.session_count}</strong> Sessions
          </span>
        </div>
        <div className="flex-1 py-2.5 px-2 rounded-xl bg-white/[0.04] border border-white/[0.07] flex flex-col items-center gap-1">
          <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-[11px] text-gray-500 leading-none">
            <strong className="text-white font-bold">{subject.document_count}</strong> Docs
          </span>
        </div>
        <div className="flex-1 py-2.5 px-2 rounded-xl bg-white/[0.04] border border-white/[0.07] flex flex-col items-center gap-1">
          <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span className="text-[11px] text-gray-500 leading-none">
            <strong className="text-white font-bold">{subject.note_count}</strong> Notes
          </span>
        </div>
      </div>
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
export default function DashboardPage({ initialSection, onSignOut, onGoToHome }: Props) {
  const [section, setSection] = useState<Section>(initialSection ?? "overview");
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
  const goalsSectionRef = useRef<GoalsSectionHandle>(null);

  // ── Dashboard widget state ───────────────────────────────────────────────────
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [dashMain, setDashMain] = useState<MainDashboard | null>(null);
  const [dashStats, setDashStats] = useState<DashboardStats | null>(null);
  const [dashLastSession, setDashLastSession] = useState<DashSession | null | undefined>(undefined);
  const [dashFlashcards, setDashFlashcards] = useState<{ due_count: number; cards: FlashcardDue[] } | null>(null);
  const [dashQuiz, setDashQuiz] = useState<{ attempts_count: number; avg_score_pct: number | null; recent_attempts: any[] } | null>(null);
  const [dashCollab, setDashCollab] = useState<{ groups_count: number; groups: StudyGroup[] } | null>(null);
  const [dashLoading, setDashLoading] = useState(true);
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

  async function loadDashboard() {
    setDashLoading(true);
    try {
      const [me, main, stats, lastSess, flashcards, quiz, collab] = await Promise.allSettled([
        getCurrentUser(),
        getMainDashboard(90),
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

  useEffect(() => { loadSubjects(); loadNotes(); loadDashboard(); }, []);

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

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const subjectMap = Object.fromEntries(subjects.map((s) => [s.id, s.name]));
  const subjectOptions = subjects.map((s) => ({ value: s.id, label: s.name }));

  return (
    <div className="min-h-screen bg-slate-950 font-sans antialiased flex">

      {/* ── Sidebar ── */}
      <aside className={`fixed top-16 left-0 bottom-0 z-40 flex flex-col w-72 bg-slate-950/80 border-r border-white/5
                         backdrop-blur-2xl transition-transform duration-300 shadow-2xl
                         ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        {/* Background glow for sidebar */}
        <div className="absolute top-0 left-0 w-full h-64 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none -z-10" />


        {/* User Profile & XP */}
        <div className="px-6 py-6 border-b border-white/5 flex-shrink-0 flex items-center gap-4">
          <div className="relative w-12 h-12 flex-shrink-0">
            {/* XP Ring */}
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path className="text-white/5" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="100, 100" />
              <path className="text-indigo-500 drop-shadow-[0_0_4px_rgba(99,102,241,0.5)] transition-all duration-1000" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${computeLevel(dashMain?.daily_snapshots ?? []).pct}, 100`} strokeLinecap="round" />
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
            <p className="text-xs text-indigo-400 font-medium">Lvl {computeLevel(dashMain?.daily_snapshots ?? []).level} • {computeLevel(dashMain?.daily_snapshots ?? []).pct}% to next</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 overflow-y-auto w-full">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest px-3 mb-4">Navigation</p>
          <div className="flex flex-col gap-1 w-full">
            {mainNavItems.map((item) => {
              const isActive = item.id === "subjects"
                ? SUBJECT_SECTIONS.includes(section) || !!selectedSubjectId
                : section === item.id;
              return (
                <button key={item.id} onClick={() => nav(item.id, { closePalette: true })}
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all w-full text-left group overflow-hidden
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
                  {!isActive && item.id === "subjects" && hasActiveSession && (
                    <div className="absolute right-3 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
                  )}
                </button>
              );
            })}

            {/* Settings */}
            <div className="mt-2 pt-2 border-t border-white/5">
              {(() => {
                const isActive = section === "settings";
                return (
                  <button onClick={() => nav("settings")}
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all w-full text-left group overflow-hidden
                                ${isActive ? "text-white" : "text-gray-400 hover:text-white hover:bg-white/[0.04]"}`}>
                    {isActive && (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-violet-500/5 opacity-100" />
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                      </>
                    )}
                    <div className={`relative z-10 flex items-center justify-center transition-colors ${isActive ? "text-indigo-400 drop-shadow-[0_0_5px_rgba(99,102,241,0.5)]" : "text-gray-500 group-hover:text-gray-300"}`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <span className="relative z-10">Settings</span>
                    {isActive && <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />}
                  </button>
                );
              })()}
            </div>
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
                <p className="text-white text-xs font-bold leading-none">{computeStreak(dashMain?.daily_snapshots ?? [])} Day Streak</p>
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
      <div className="flex-1 lg:ml-72 flex flex-col min-h-screen relative overflow-hidden pt-16">
        {/* Ambient background glow for main content */}
        <div className="absolute top-0 right-0 w-[800px] h-[600px] bg-indigo-600/5 rounded-full blur-[100px] pointer-events-none -z-10" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[400px] bg-violet-600/5 rounded-full blur-[100px] pointer-events-none -z-10" />

        {/* Top bar — fixed, spans full viewport width */}
        <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-slate-950/80 backdrop-blur-2xl border-b border-white/5 flex items-center px-6 gap-4 shadow-sm">

          {/* Mobile sidebar toggle */}
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-400 hover:text-white p-1 transition-colors flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Logo + Brand — navigates to dashboard overview */}
          <button
            onClick={() => nav("overview")}
            className="flex items-center gap-2.5 cursor-pointer select-none flex-shrink-0 group"
          >
            <img src="/assets/Logomark_final3.svg" alt="StudyBuddy" className="w-7 h-7 group-hover:scale-105 transition-transform duration-200" />
            <span className="text-white font-extrabold text-lg tracking-tighter hidden sm:block">
              Study<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Buddy</span>
            </span>
          </button>

          {/* Search — opens command palette */}
          <button
            onClick={() => { setCmdQuery(""); setShowCmdPalette(true); }}
            className="w-56 lg:w-72 hidden sm:flex items-center gap-2 bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 hover:border-white/20 hover:bg-white/[0.08] transition-all cursor-pointer text-left flex-shrink-0"
          >
            <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-sm text-gray-600 flex-1">Search workspaces, notes…</span>
            <kbd className="hidden lg:inline text-[10px] text-gray-600 border border-white/10 rounded px-1.5 py-0.5 font-mono">⌘K</kbd>
          </button>

          {/* Spacer — pushes all right-side items to the right */}
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
            <button onClick={() => goalsSectionRef.current?.openCreate()}
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
            {(dashMain?.recommendations?.length ?? 0) > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.8)]" />
            )}
          </button>

          {/* Profile */}
          <button
            onClick={() => nav("settings")}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-white/[0.06] transition-all flex-shrink-0 group"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500/40 to-violet-500/40 border border-indigo-400/30 flex items-center justify-center flex-shrink-0">
              <span className="text-indigo-200 font-bold text-xs">
                {(userProfile?.first_name || userProfile?.username || userProfile?.email || "U").charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors hidden md:block max-w-[100px] truncate">
              {userProfile?.first_name || userProfile?.username || "Profile"}
            </span>
            <svg className="w-3.5 h-3.5 text-gray-600 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">

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
            <OverviewSection
              dashMain={dashMain}
              dashStats={dashStats}
              dashLastSession={dashLastSession}
              dashFlashcards={dashFlashcards}
              dashQuiz={dashQuiz}
              dashCollab={dashCollab}
              dashLoading={dashLoading}
              userProfile={userProfile}
              streak={computeStreak(dashMain?.daily_snapshots ?? [])}
              subjectsCount={subjects.length}
              onCreateSubject={openCreateSubject}
              onCreateGoal={() => { nav("goals"); setTimeout(() => goalsSectionRef.current?.openCreate(), 50); }}
              onResumeSession={(subjectId) => subjectId ? navToSubject(subjectId) : nav("subjects")}
              onNavigateToSessions={() => nav("subjects")}
              onNavigateToSubjects={() => nav("subjects")}
              onNavigateToLibrary={() => nav("library")}
              onNavigateToGoals={() => nav("goals")}
              onNavigateToGroups={() => nav("groups")}
              onCreateSession={() => nav("subjects")}
              onDismissRec={async (id: string) => {
                await dismissRecommendation(id);
                setDashMain(prev => prev ? { ...prev, recommendations: prev.recommendations.filter(r => r.id !== id) } : prev);
              }}
            />
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
                      onDelete={setDeleteSubjectTarget}
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
                      {subject.description && (
                        <p className="text-gray-500 text-sm mt-1">{subject.description}</p>
                      )}
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
              {libraryTab === "documents" && <DocumentsSection subjects={subjects} subjectFilter={librarySubjectFilter} />}

              {/* Notes tab */}
              {libraryTab === "notes" && (
                <div className="flex flex-col gap-6">
                  {notesError && (
                    <div className="rounded-2xl bg-red-500/10 border border-red-400/20 px-5 py-4 text-sm text-red-300 flex items-center justify-between">
                      {notesError}<button onClick={() => setNotesError(null)} className="text-red-400 hover:text-red-200 ml-4">✕</button>
                    </div>
                  )}
                  <p className="text-gray-500 text-sm">{notesLoading ? "Loading…" : `${notes.filter(n => !librarySubjectFilter || n.study_subject_id === librarySubjectFilter).length} note${notes.filter(n => !librarySubjectFilter || n.study_subject_id === librarySubjectFilter).length !== 1 ? "s" : ""}`}</p>
                  {notesLoading && <SkeletonGrid />}
                  {!notesLoading && notes.filter(n => !librarySubjectFilter || n.study_subject_id === librarySubjectFilter).length === 0 && (
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
                  {!notesLoading && notes.filter(n => !librarySubjectFilter || n.study_subject_id === librarySubjectFilter).length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {notes.filter(n => !librarySubjectFilter || n.study_subject_id === librarySubjectFilter).map((n) => (
                        <NoteCard key={n.id} note={n}
                          subjectName={n.study_subject_id ? subjectMap[n.study_subject_id] : undefined}
                          onEdit={openEditNote} onDelete={setDeleteNoteTarget} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Flashcards tab */}
              {libraryTab === "flashcards" && <FlashcardsSection subjects={subjects} subjectFilter={librarySubjectFilter} />}

              {/* Quizzes tab */}
              {libraryTab === "quizzes" && <QuizzesSection />}
            </div>
          )}

          {/* ── Goals ── */}
          {section === "goals" && <GoalsSection ref={goalsSectionRef} subjects={subjects} />}

          {/* ── Study Groups ── */}
          {section === "groups" && <GroupsSection currentUserId={userProfile?.id ?? ""} />}

          {section === "settings" && <SettingsSection dashMain={dashMain} userProfile={userProfile} />}
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
                <p className="text-xs text-gray-500 mt-0.5">{dashMain?.recommendations?.length ?? 0} active</p>
              </div>
              <button onClick={() => setShowNotifications(false)} className="text-gray-600 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              {(dashMain?.recommendations ?? []).length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 px-6 text-center">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-400 text-sm font-medium">You're all caught up!</p>
                  <p className="text-gray-600 text-xs">No new recommendations right now.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {(dashMain?.recommendations ?? []).map((r) => {
                    const typeColors: Record<string, string> = {
                      next_session: "bg-indigo-500/15 text-indigo-400",
                      review_reminder: "bg-violet-500/15 text-violet-400",
                      pace_warning: "bg-amber-500/15 text-amber-400",
                      topic_suggestion: "bg-emerald-500/15 text-emerald-400",
                    };
                    return (
                      <div key={r.id} className="flex items-start gap-3 px-5 py-4 hover:bg-white/[0.03] transition-colors">
                        <div className={`text-[10px] font-bold px-2 py-1 rounded-md flex-shrink-0 mt-0.5 ${typeColors[r.recommendation_type] ?? "bg-gray-500/15 text-gray-400"}`}>
                          {r.recommendation_type.replace("_", " ")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-semibold">{r.title}</p>
                          <p className="text-gray-500 text-xs mt-0.5 leading-relaxed line-clamp-2">{r.body}</p>
                        </div>
                        <button
                          onClick={() => {
                            dismissRecommendation(r.id);
                            setDashMain((prev) =>
                              prev ? { ...prev, recommendations: prev.recommendations.filter((x) => x.id !== r.id) } : prev
                            );
                          }}
                          className="text-gray-600 hover:text-gray-300 transition-colors flex-shrink-0 p-0.5 mt-0.5"
                          title="Dismiss"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
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
              {/* Recent Sessions */}
              {(() => {
                const results = (dashMain?.recent_sessions ?? []).filter(
                  (s) =>
                    !cmdQuery ||
                    s.title?.toLowerCase().includes(cmdQuery.toLowerCase()) ||
                    s.intention_text?.toLowerCase().includes(cmdQuery.toLowerCase())
                ).slice(0, 4);
                if (results.length === 0) return null;
                return (
                  <>
                    <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Workspaces</p>
                    {results.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => { setShowCmdPalette(false); s.study_subject_id ? navToSubject(s.study_subject_id) : nav("subjects"); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.05] text-left transition-colors"
                      >
                        <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                          <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium truncate">
                            {s.title || s.intention_text?.slice(0, 50) || "Untitled Workspace"}
                          </p>
                          <p className="text-gray-600 text-xs capitalize">{s.session_type} · {s.status}</p>
                        </div>
                      </button>
                    ))}
                  </>
                );
              })()}

              {/* Notes */}
              {(() => {
                const results = notes.filter(
                  (n) =>
                    !cmdQuery ||
                    n.title.toLowerCase().includes(cmdQuery.toLowerCase()) ||
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
                          <p className="text-white text-xs font-medium truncate">{n.title}</p>
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
                (dashMain?.recent_sessions ?? []).filter(
                  (s) =>
                    s.title?.toLowerCase().includes(cmdQuery.toLowerCase()) ||
                    s.intention_text?.toLowerCase().includes(cmdQuery.toLowerCase())
                ).length === 0 &&
                notes.filter((n) => n.title.toLowerCase().includes(cmdQuery.toLowerCase())).length === 0 &&
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
                Delete <span className="text-white font-semibold">"{deleteNoteTarget.title}"</span>? This cannot be undone.
              </p>
              <ModalActions onCancel={() => setDeleteNoteTarget(null)} submitLabel="Delete" loading={deleteNoteLoading} danger />
            </form>
          </Modal>
        )
      }

    </div >
  );
}
