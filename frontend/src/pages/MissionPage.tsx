import { useState, useEffect } from "react";
import type { BigGoal, BigGoalStatus } from "../api/big_goals";
import { updateBigGoal } from "../api/big_goals";
import type { Subject } from "../api/subjects";
import Modal from "../components/ui/Modal";
import type { Workspace } from "../api/workspaces";
import type { Document } from "../api/documents";
import { getNotes, createNote, type Note } from "../api/notes";
import type { FlashcardDeck } from "../api/flashcards";
import type { QuizSet } from "../api/quiz";
import { getWorkspaces } from "../api/workspaces";
import { getDocuments } from "../api/documents";
import { getDecks } from "../api/flashcards";
import { getQuizSets } from "../api/quiz";
import { fmtSize } from "../components/ui/utils";
import CanvasNoteEditor from "../components/canvas/CanvasNoteEditor";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "overview" | "subjects" | "workspaces" | "documents" | "notes" | "flashcards" | "quizzes" | "ai";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "overview",    label: "Overview",    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { id: "subjects",    label: "Subjects",    icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  { id: "workspaces",  label: "Workspaces",  icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
  { id: "documents",   label: "Documents",   icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { id: "notes",       label: "Notes",       icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
  { id: "flashcards",  label: "Flashcards",  icon: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" },
  { id: "quizzes",     label: "Quizzes",     icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
  { id: "ai",          label: "AI Assets",   icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
];

// ── Status helpers ─────────────────────────────────────────────────────────────

function statusBadge(status: BigGoalStatus) {
  const map: Record<string, string> = {
    active:            "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
    paused:            "bg-amber-400/10 text-amber-400 border-amber-400/20",
    completed:         "bg-blue-400/10 text-blue-400 border-blue-400/20",
    overdue:           "bg-red-400/10 text-red-400 border-red-400/20",
    ready_to_complete: "bg-cyan-400/10 text-cyan-400 border-cyan-400/20",
    canceled:          "bg-gray-400/10 text-gray-400 border-gray-400/20",
  };
  return map[status] ?? map.canceled;
}

function progressColor(pct: number) {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 40) return "bg-violet-500";
  return "bg-indigo-500";
}

// ── Small reusable card shell ─────────────────────────────────────────────────

function ItemCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] ${className}`}>
      {children}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="col-span-full flex flex-col items-center gap-3 py-20 text-center">
      <p className="text-gray-500 text-sm">{label}</p>
    </div>
  );
}

// ── Doc status badge ──────────────────────────────────────────────────────────

function DocStatus({ status }: { status: string }) {
  const map: Record<string, string> = {
    ready:      "bg-emerald-400/10 text-emerald-400",
    processing: "bg-amber-400/10 text-amber-400",
    uploaded:   "bg-gray-400/10 text-gray-400",
    failed:     "bg-red-400/10 text-red-400",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${map[status] ?? map.uploaded}`}>
      {status}
    </span>
  );
}

// ── Workspace status badge ────────────────────────────────────────────────────

function WsStatus({ status }: { status: string }) {
  const map: Record<string, string> = {
    active:    "bg-emerald-400/10 text-emerald-400",
    paused:    "bg-amber-400/10 text-amber-400",
    completed: "bg-blue-400/10 text-blue-400",
    canceled:  "bg-red-400/10 text-red-400",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${map[status] ?? map.active}`}>
      {status}
    </span>
  );
}

// ── Main MissionPage ──────────────────────────────────────────────────────────

interface Props {
  goal: BigGoal;
  subjects: Subject[];
  onBack: () => void;
  onGoalUpdate?: (g: BigGoal) => void;
}

// ── Add Subjects Modal ────────────────────────────────────────────────────────

function AddSubjectsModal({
  goal,
  allSubjects,
  onSaved,
  onClose,
}: {
  goal: BigGoal;
  allSubjects: Subject[];
  onSaved: (updated: BigGoal) => void;
  onClose: () => void;
}) {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set(goal.subject_ids));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggle = (id: string) =>
    setCheckedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const updated = await updateBigGoal(goal.id, { subject_ids: [...checkedIds] });
      onSaved(updated);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update subjects.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Add Subjects to Mission" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-gray-500">
          Select the subjects linked to <span className="text-white font-medium">"{goal.title}"</span>.
        </p>

        {allSubjects.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">No subjects yet. Create one in the Subjects section.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {allSubjects.map(s => {
              const checked = checkedIds.has(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggle(s.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                    checked
                      ? "bg-violet-500/15 border-violet-500/40 text-white"
                      : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    checked ? "bg-violet-500 border-violet-500" : "border-gray-600"
                  }`}>
                    {checked && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-lg flex-shrink-0">{s.icon ?? "📚"}</span>
                  <span className="font-medium text-sm">{s.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-white/15 text-gray-400 hover:text-white font-semibold text-sm transition-colors">
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || allSubjects.length === 0}
            className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function MissionPage({ goal, subjects, onBack, onGoalUpdate }: Props) {
  const [tab, setTab] = useState<Tab>("overview");

  const [currentGoal,     setCurrentGoal]     = useState<BigGoal>(goal);
  const [workspaces,      setWorkspaces]      = useState<Workspace[]>([]);
  const [documents,       setDocuments]       = useState<Document[]>([]);
  const [notes,           setNotes]           = useState<Note[]>([]);
  const [decks,           setDecks]           = useState<FlashcardDeck[]>([]);
  const [quizSets,        setQuizSets]        = useState<QuizSet[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [openCanvas,      setOpenCanvas]      = useState<Note | null>(null);
  const [creatingCanvas,  setCreatingCanvas]  = useState(false);
  const [showAddSubjects, setShowAddSubjects] = useState(false);

  const goalSubjects = subjects.filter(s => currentGoal.subject_ids.includes(s.id));

  // ── Load all mission-scoped data ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        // 1. Workspaces for every subject in this mission
        const wsArrays = await Promise.all(
          currentGoal.subject_ids.map(sid => getWorkspaces({ subject_id: sid }).catch(() => [] as Workspace[]))
        );
        const allWs = wsArrays.flat();
        if (cancelled) return;
        setWorkspaces(allWs);

        if (allWs.length === 0) { setLoading(false); return; }

        // 2. Notes (by subject_id)
        const noteArrays = await Promise.all(
          currentGoal.subject_ids.map(sid => getNotes({ subject_id: sid }).catch(() => [] as Note[]))
        );
        const allNotes = noteArrays.flat();

        // 3. Documents, flashcard decks, quiz sets (per workspace)
        const [docArrays, deckArrays, quizArrays] = await Promise.all([
          Promise.all(allWs.map(w => getDocuments(w.id).catch(() => [] as Document[]))),
          Promise.all(allWs.map(w => getDecks(w.id).catch(() => [] as FlashcardDeck[]))),
          Promise.all(allWs.map(w => getQuizSets(w.id).catch(() => [] as QuizSet[]))),
        ]);

        if (cancelled) return;
        setDocuments(docArrays.flat());
        setNotes(allNotes);
        setDecks(deckArrays.flat());
        setQuizSets(quizArrays.flat());
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [currentGoal.id, currentGoal.subject_ids.join(",")]);

  // ── Canvas note creation ─────────────────────────────────────────────────────
  async function handleCreateCanvasNote() {
    // Use the first subject linked to this goal; fall back to goalSubjects[0]
    const subjectId = currentGoal.subject_ids[0];
    if (!subjectId) return;
    setCreatingCanvas(true);
    try {
      const note = await createNote({
        subject_id: subjectId,
        workspace_id: workspaces[0]?.id,
        title: "Untitled Note",
        content: JSON.stringify({}),
        canvas_enabled: true,
      });
      setNotes(prev => [note, ...prev]);
      setOpenCanvas(note);
    } finally {
      setCreatingCanvas(false);
    }
  }

  // ── Derived counts ────────────────────────────────────────────────────────────
  const readyDocs = documents.filter(d => d.status === "ready");

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-full">

      {/* ── Header ── */}
      <div className="mb-6">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors mb-4">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          All Missions
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-2xl font-extrabold text-white tracking-tight">{currentGoal.title}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${statusBadge(currentGoal.status)}`}>
                {currentGoal.status.replace(/_/g, " ")}
              </span>
            </div>
            {currentGoal.description && (
              <p className="text-sm text-gray-400 mt-0.5">{currentGoal.description}</p>
            )}
          </div>
          {currentGoal.deadline && (
            <div className="flex-shrink-0 text-right">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Deadline</p>
              <p className="text-sm font-semibold text-white mt-0.5">
                {new Date(currentGoal.deadline!).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-4 space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Mission progress</span>
            <span className="font-bold text-white">{currentGoal.progress_pct}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${progressColor(currentGoal.progress_pct)}`}
              style={{ width: `${currentGoal.progress_pct}%` }} />
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-6 flex-shrink-0" style={{ scrollbarWidth: "none" }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
              tab === t.id
                ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                : "text-gray-500 hover:text-white hover:bg-white/5 border border-transparent"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={t.icon} />
            </svg>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* OVERVIEW */}
          {tab === "overview" && (
            <div className="space-y-6">
              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Subjects",    value: goalSubjects.length,  color: "#818cf8" },
                  { label: "Workspaces",  value: workspaces.length,    color: "#a78bfa" },
                  { label: "Documents",   value: documents.length,     color: "#22d3ee" },
                  { label: "Notes",       value: notes.length,         color: "#34d399" },
                  { label: "Flashcard Decks", value: decks.length,     color: "#f59e0b" },
                  { label: "Quiz Sets",   value: quizSets.length,      color: "#f87171" },
                  { label: "AI Processed", value: readyDocs.length,    color: "#c084fc" },
                  { label: "Days Left",
                    value: currentGoal.deadline
                      ? Math.max(0, Math.ceil((new Date(currentGoal.deadline).getTime() - Date.now()) / 86400000))
                      : "—",
                    color: "#94a3b8" },
                ].map(stat => (
                  <div key={stat.label}
                    className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                    <p className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</p>
                    <p className="text-xs mt-1 text-gray-500">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Subjects quick view */}
              {goalSubjects.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Linked Subjects</p>
                  <div className="flex flex-wrap gap-2">
                    {goalSubjects.map(s => (
                      <span key={s.id}
                        className="px-3 py-1.5 rounded-xl text-sm font-semibold bg-violet-500/10 border border-violet-500/20 text-violet-300">
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent docs */}
              {documents.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Recent Documents</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {documents.slice(0, 6).map(d => (
                      <ItemCard key={d.id} className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{d.original_filename}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <DocStatus status={d.status} />
                            <span className="text-[10px] text-gray-500">{fmtSize(d.file_size)}</span>
                          </div>
                        </div>
                      </ItemCard>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SUBJECTS */}
          {tab === "subjects" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  {goalSubjects.length} subject{goalSubjects.length !== 1 ? "s" : ""}
                </p>
                <button
                  onClick={() => setShowAddSubjects(true)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 hover:bg-indigo-500/25 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
                  </svg>
                  Add Subjects
                </button>
              </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {goalSubjects.length === 0
                ? <EmptyState label="No subjects linked yet. Click 'Add Subjects' to link some." />
                : goalSubjects.map(s => (
                    <ItemCard key={s.id}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: s.color_hex ? `${s.color_hex}20` : "rgba(129,140,248,0.1)", border: `1px solid ${s.color_hex ?? "#818cf8"}30` }}>
                          <span className="text-lg">{s.icon ?? "📚"}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">{s.name}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            {workspaces.filter(w => w.subject_id === s.id).length} workspace(s)
                          </p>
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-500">
                        Created {new Date(s.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    </ItemCard>
                  ))
              }
            </div>
            </div>
          )}

          {/* WORKSPACES */}
          {tab === "workspaces" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {workspaces.length === 0
                ? <EmptyState label="No workspaces yet. Use 'Setup Workspace' on the mission card." />
                : workspaces.map(w => (
                    <ItemCard key={w.id}>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <p className="text-sm font-bold text-white leading-tight">{w.title}</p>
                        <WsStatus status={w.status} />
                      </div>
                      <div className="flex gap-3 text-xs text-gray-500">
                        <span>{documents.length} doc(s)</span>
                        <span>{decks.length} deck(s)</span>
                      </div>
                      <p className="text-[10px] text-gray-600 mt-2">
                        Created {new Date(w.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </ItemCard>
                  ))
              }
            </div>
          )}

          {/* DOCUMENTS */}
          {tab === "documents" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.length === 0
                ? <EmptyState label="No documents yet. Upload files from the Library." />
                : documents.map(d => (
                    <ItemCard key={d.id}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{d.original_filename}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{fmtSize(d.file_size)}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <DocStatus status={d.status} />
                        <span className="text-[10px] text-gray-600">
                          {new Date(d.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      {d.error_message && (
                        <p className="text-[10px] text-red-400 mt-2 truncate">{d.error_message}</p>
                      )}
                    </ItemCard>
                  ))
              }
            </div>
          )}

          {/* NOTES */}
          {tab === "notes" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  {notes.length} note{notes.length !== 1 ? "s" : ""}
                </p>
                <button
                  onClick={handleCreateCanvasNote}
                  disabled={creatingCanvas || currentGoal.subject_ids.length === 0}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-violet-500/15 text-violet-300 border border-violet-500/25 hover:bg-violet-500/25 transition-colors disabled:opacity-50"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                  {creatingCanvas ? "Creating…" : "Create Canvas Note"}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {notes.length === 0
                  ? <EmptyState label="No notes yet. Click 'Create Canvas Note' to start." />
                  : notes.map(n => (
                      <ItemCard key={n.id}
                        className={n.canvas_enabled ? "border-violet-500/20 hover:border-violet-500/40 cursor-pointer transition-colors" : ""}
                        {...(n.canvas_enabled ? { onClick: () => setOpenCanvas(n) } : {})}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {n.canvas_enabled && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 font-semibold border border-violet-500/20 flex-shrink-0">
                              Canvas
                            </span>
                          )}
                          <p className="text-sm font-bold text-white truncate flex-1">
                            {n.title ?? "Untitled note"}
                          </p>
                        </div>
                        {!n.canvas_enabled && (
                          <p className="text-xs text-gray-400 line-clamp-3">{n.content}</p>
                        )}
                        {n.canvas_enabled && (
                          <p className="text-xs text-gray-500 italic">Click to open editor</p>
                        )}
                        <p className="text-[10px] text-gray-600 mt-3">
                          {new Date(n.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </ItemCard>
                    ))
                }
              </div>
            </div>
          )}

          {/* FLASHCARDS */}
          {tab === "flashcards" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {decks.length === 0
                ? <EmptyState label="No flashcard decks yet. Create decks from the Library." />
                : decks.map(d => (
                    <ItemCard key={d.id}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: d.color_hex ? `${d.color_hex}20` : "rgba(52,211,153,0.1)", border: `1px solid ${d.color_hex ?? "#34d399"}30` }}>
                          <span className="text-xl">{d.icon ?? "🃏"}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">{d.title}</p>
                          {d.description && (
                            <p className="text-[10px] text-gray-500 mt-0.5 truncate">{d.description}</p>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-600">
                        Created {new Date(d.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </ItemCard>
                  ))
              }
            </div>
          )}

          {/* QUIZZES */}
          {tab === "quizzes" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {quizSets.length === 0
                ? <EmptyState label="No quiz sets yet. Create quizzes from the Library." />
                : quizSets.map(q => (
                    <ItemCard key={q.id}>
                      <p className="text-sm font-bold text-white mb-1 truncate">{q.title}</p>
                      {q.description && (
                        <p className="text-xs text-gray-400 mb-2 line-clamp-2">{q.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-[10px] text-gray-500">
                        {q.time_limit_minutes && <span>⏱ {q.time_limit_minutes} min</span>}
                        <span>
                          Created {new Date(q.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    </ItemCard>
                  ))
              }
            </div>
          )}

          {/* AI ASSETS */}
          {tab === "ai" && (
            <div className="space-y-6">
              {/* AI-processed docs */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                    AI-Extracted Documents
                  </p>
                  <span className="text-xs text-purple-400 font-bold">{readyDocs.length}</span>
                </div>
                {readyDocs.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4">
                    No documents have been AI-processed yet. Upload a PDF, DOCX, or TXT and the text will be extracted automatically.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {readyDocs.map(d => (
                      <ItemCard key={d.id} className="border-purple-500/10">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <p className="text-sm font-semibold text-white truncate">{d.original_filename}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-400/10 text-purple-400 font-semibold">
                            Text Extracted
                          </span>
                          <span className="text-[10px] text-gray-500">{fmtSize(d.file_size)}</span>
                        </div>
                      </ItemCard>
                    ))}
                  </div>
                )}
              </div>

              {/* AI-generated study materials */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Study Materials</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <ItemCard>
                    <p className="text-2xl font-black text-emerald-400 mb-1">{decks.length}</p>
                    <p className="text-xs text-gray-500">Flashcard Decks</p>
                  </ItemCard>
                  <ItemCard>
                    <p className="text-2xl font-black text-amber-400 mb-1">{quizSets.length}</p>
                    <p className="text-xs text-gray-500">Quiz Sets</p>
                  </ItemCard>
                </div>
              </div>

              {/* Upload CTA if no ready docs */}
              {documents.length === 0 && (
                <div className="p-6 rounded-2xl border border-dashed border-white/10 text-center">
                  <p className="text-sm font-semibold text-white mb-1">Upload documents to unlock AI features</p>
                  <p className="text-xs text-gray-500">
                    Upload PDFs, DOCX, or TXT files — AI will extract the text and prepare study materials.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Add Subjects modal ── */}
      {showAddSubjects && (
        <AddSubjectsModal
          goal={currentGoal}
          allSubjects={subjects}
          onSaved={updated => {
            setCurrentGoal(updated);
            onGoalUpdate?.(updated);
          }}
          onClose={() => setShowAddSubjects(false)}
        />
      )}

      {/* ── Canvas Note Editor overlay ── */}
      {openCanvas && (
        <CanvasNoteEditor
          note={openCanvas}
          onClose={() => setOpenCanvas(null)}
          onSaved={updated => {
            setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
            setOpenCanvas(updated);
          }}
        />
      )}
    </div>
  );
}
