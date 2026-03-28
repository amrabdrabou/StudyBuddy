import { useEffect, useRef, useState } from "react";
import { useNavStore } from "../store/navStore";
import { getWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace, type Workspace, type WorkspaceStatus } from "../api/workspaces";
import { getSubjects, type Subject } from "../api/subjects";
import { getDocuments, uploadDocument, deleteDocument, getDocumentContent, type Document, type DocumentContent } from "../api/documents";
import CanvasNoteEditor from "../components/canvas/CanvasNoteEditor";
import DocumentCanvasViewer from "../components/canvas/DocumentCanvasViewer";
import { getNotes, createNote, deleteNote, type Note } from "../api/notes";
import { getDecks, getCards, updateCard, type FlashcardDeck, type Flashcard } from "../api/flashcards";
import { getQuizSets, getQuestions, startAttempt, submitAnswer, updateAttempt, type QuizSet, type QuizQuestion, type QuizOption, type QuizAttempt } from "../api/quiz";
import { aiSummarize, aiGenerateFlashcards, aiGenerateQuiz, aiGenerateRoadmap, aiGenerateStudySession, aiSuggestSession, type Difficulty, type SuggestSessionResponse } from "../api/ai";
import { getMicroGoals, createMicroGoal, updateMicroGoal, deleteMicroGoal, type MicroGoal, type MicroGoalStatus } from "../api/micro_goals";
import { getSessions, createSession, updateSession, deleteSession, type Session } from "../api/sessions";
import { getChatHistory, sendChatMessage, clearChatHistory, type AIChatMessage } from "../api/chat";
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
  const { navState, setWorkspaceTab } = useNavStore();
  const tab = (navState.tab as WorkspaceTab | undefined) ?? "documents";
  const [error, setError] = useState("");
  const [sessionGoal, setSessionGoal] = useState<MicroGoal | null>(null);

  const handleStartSession = (goal: MicroGoal) => {
    setSessionGoal(goal);
    setWorkspaceTab("sessions");
  };

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
          <button key={t.id} onClick={() => setWorkspaceTab(t.id)}
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
      {tab === "micro-goals" && <MicroGoalsTab workspaceId={workspace.id} onStartSession={handleStartSession} />}
      {tab === "sessions"    && <SessionsTab workspaceId={workspace.id} initialGoal={sessionGoal} onConsumed={() => setSessionGoal(null)} />}
      {tab === "flashcards"  && <FlashcardsTab workspaceId={workspace.id} />}
      {tab === "quizzes"     && <QuizzesTab workspaceId={workspace.id} />}
      {tab === "timeline"    && <TimelineTab workspaceId={workspace.id} />}
    </div>
  );
}

// ── Summary Tab ───────────────────────────────────────────────────────────────

function SummaryTab({ workspaceId }: { workspaceId: string }) {
  const [docs, setDocs]           = useState<Document[]>([]);
  const [loading, setLoading]     = useState(true);
  // per-document state
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState<string | null>(null); // doc id
  const [error, setError]         = useState("");

  useEffect(() => {
    (async () => {
      try {
        const docs = await getDocuments(workspaceId);
        setDocs(docs);
        const readyDocs = docs.filter(d => d.status === "ready");
        if (readyDocs.length > 0) {
          const contents = await Promise.all(
            readyDocs.map(d => getDocumentContent(workspaceId, d.id).catch(() => null))
          );
          const initial: Record<string, string> = {};
          contents.forEach((c, i) => { if (c?.summary) initial[readyDocs[i].id] = c.summary; });
          setSummaries(initial);
        }
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, [workspaceId]);

  const handleSummarize = async (doc: Document) => {
    setGenerating(doc.id); setError("");
    try {
      const res = await aiSummarize(workspaceId, doc.id);
      setSummaries(prev => ({ ...prev, [doc.id]: res.summary }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Summarization failed. Check your API key.");
    } finally {
      setGenerating(null);
    }
  };

  if (loading) return <div className="text-gray-500 text-sm">Loading…</div>;

  const readyDocs = docs.filter(d => d.status === "ready");

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white">Document Summaries</h3>
        <p className="text-xs text-gray-500 mt-0.5">Click "Summarize" on any ready document to generate an AI summary.</p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      {docs.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">No documents uploaded yet.</div>
      ) : readyDocs.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">Documents are still being processed.</div>
      ) : (
        <div className="space-y-3">
          {readyDocs.map(doc => {
            const summary = summaries[doc.id];
            const busy    = generating === doc.id;
            return (
              <div key={doc.id} className="rounded-xl border border-white/5 overflow-hidden">
                {/* Doc header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-white/5">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-white truncate flex-1">{doc.original_filename}</p>
                  <button
                    onClick={() => handleSummarize(doc)}
                    disabled={busy}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 disabled:opacity-50 transition-colors flex-shrink-0"
                  >
                    {busy ? (
                      <><span className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin" />Generating…</>
                    ) : summary ? (
                      <>↻ Re-summarize</>
                    ) : (
                      <>✨ Summarize</>
                    )}
                  </button>
                </div>

                {/* Summary body */}
                <div className="px-4 py-3">
                  {summary ? (
                    <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{summary}</pre>
                  ) : busy ? (
                    <div className="space-y-1.5 py-2 animate-pulse">
                      <div className="h-2 rounded-full bg-white/5 w-full" />
                      <div className="h-2 rounded-full bg-white/5 w-5/6" />
                      <div className="h-2 rounded-full bg-white/5 w-4/6" />
                    </div>
                  ) : (
                    <p className="text-xs text-gray-600 py-1">Click "Summarize" to generate an AI summary for this document.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Micro Goals Tab ───────────────────────────────────────────────────────────

function MicroGoalsTab({
  workspaceId,
  onStartSession,
}: {
  workspaceId: string;
  onStartSession: (goal: MicroGoal) => void;
}) {
  const [goals, setGoals]           = useState<MicroGoal[]>([]);
  const [docs, setDocs]             = useState<Document[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [generating, setGen]        = useState(false);
  const [genError, setGenError]     = useState("");
  const [genSuccess, setGenSuccess] = useState<number | null>(null);
  const [newTitle, setNewTitle]     = useState("");
  const [adding, setAdding]         = useState(false);

  const loadGoals = () =>
    getMicroGoals(workspaceId).then(setGoals).catch(() => {}).finally(() => setLoading(false));

  useEffect(() => {
    (async () => {
      try {
        const [g, d] = await Promise.all([
          getMicroGoals(workspaceId),
          getDocuments(workspaceId),
        ]);
        setGoals(g);
        const ready = d.filter(doc => doc.status === "ready");
        setDocs(ready);
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, [workspaceId]);

  const toggleDoc = (id: string) =>
    setSelectedDocs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleGenerateRoadmap = async () => {
    setGen(true); setGenError(""); setGenSuccess(null);
    try {
      const res = await aiGenerateRoadmap(workspaceId, {
        document_ids: selectedDocs.size > 0 ? [...selectedDocs] : undefined,
      });
      setGenSuccess(res.goals_created);
      await loadGoals();
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : "Failed to generate roadmap.");
    } finally { setGen(false); }
  };

  const handleAddGoal = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      await createMicroGoal(workspaceId, { title: newTitle.trim(), order_index: goals.length });
      setNewTitle(""); await loadGoals();
    } catch { /* silent */ }
    finally { setAdding(false); }
  };

  const handleStatusToggle = async (goal: MicroGoal) => {
    const cycle: MicroGoalStatus[] = ["suggested", "pending", "in_progress", "completed"];
    const next = cycle[(cycle.indexOf(goal.status as MicroGoalStatus) + 1) % cycle.length];
    try { await updateMicroGoal(workspaceId, goal.id, { status: next }); await loadGoals(); }
    catch { /* silent */ }
  };

  const handleDelete = async (id: string) => {
    try { await deleteMicroGoal(workspaceId, id); await loadGoals(); }
    catch { /* silent */ }
  };

  const statusBadge = (s: string) => {
    if (s === "completed")   return { icon: "✅", cls: "text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20" };
    if (s === "in_progress") return { icon: "🔄", cls: "text-blue-400 bg-blue-400/10 hover:bg-blue-400/20" };
    if (s === "pending")     return { icon: "⏳", cls: "text-amber-400 bg-amber-400/10 hover:bg-amber-400/20" };
    if (s === "skipped")     return { icon: "⏭️", cls: "text-gray-500 bg-gray-500/10 hover:bg-gray-500/20" };
    return { icon: "💡", cls: "text-violet-400 bg-violet-400/10 hover:bg-violet-400/20" };
  };

  return (
    <div className="space-y-6">
      {/* ── Generate Roadmap panel ── */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white">AI Roadmap</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Select one or more documents to generate a roadmap from their summaries.
            Generating replaces the current roadmap. Make sure documents are summarised first.
          </p>
        </div>

        {/* Document picker */}
        {docs.length === 0 ? (
          <p className="text-xs text-gray-600 bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3">
            No ready documents found. Upload and summarise documents first.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Documents {selectedDocs.size > 0 ? `(${selectedDocs.size} selected)` : "(all)"}
              </p>
              {selectedDocs.size > 0 && (
                <button
                  onClick={() => setSelectedDocs(new Set())}
                  className="text-xs text-gray-500 hover:text-white transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            {docs.map(doc => (
              <label key={doc.id} className="flex items-center gap-3 px-3 py-2.5 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={selectedDocs.has(doc.id)}
                  onChange={() => toggleDoc(doc.id)}
                  className="w-4 h-4 rounded accent-violet-500 flex-shrink-0"
                />
                <span className="text-sm text-white truncate">{doc.original_filename}</span>
              </label>
            ))}
            {selectedDocs.size === 0 && (
              <p className="text-xs text-gray-600 pl-1">No selection = use all documents above</p>
            )}
          </div>
        )}

        {genError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{genError}</p>}
        {genSuccess !== null && (
          <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg">
            ✓ Roadmap regenerated — {genSuccess} goal{genSuccess !== 1 ? "s" : ""} created.
          </p>
        )}

        <button
          onClick={handleGenerateRoadmap}
          disabled={generating || docs.length === 0}
          className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {generating
            ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Generating…</>
            : "✨ Generate Roadmap"}
        </button>
      </div>

      {/* Manual add */}
      <div className="flex gap-2">
        <input type="text" value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAddGoal()}
          placeholder="Add a goal manually…" maxLength={300}
          className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors"
        />
        <button onClick={handleAddGoal} disabled={adding || !newTitle.trim()}
          className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/30 disabled:opacity-50 transition-colors text-sm">
          {adding ? "…" : "+"}
        </button>
      </div>

      {/* Goals list */}
      {loading ? (
        <div className="text-gray-500 text-sm">Loading…</div>
      ) : goals.length === 0 ? (
        <div className="text-center py-10 text-gray-500 text-sm">
          <p className="text-3xl mb-2">🗺️</p>
          <p>No goals yet. Generate a roadmap from your documents or add goals manually.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Micro-Goals</p>
          {goals.map(goal => {
            const { icon, cls } = statusBadge(goal.status);
            return (
              <div key={goal.id} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5 group">
                <button onClick={() => handleStatusToggle(goal)} title={`Status: ${goal.status} — click to advance`}
                  className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 transition-colors ${cls}`}>
                  {icon}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${goal.status === "completed" ? "line-through text-gray-600" : "text-white"}`}>
                    {goal.title}
                  </p>
                  {goal.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{goal.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                  <button
                    onClick={() => onStartSession(goal)}
                    title="Start a study session for this goal"
                    className="text-xs px-2.5 py-1 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors whitespace-nowrap"
                  >
                    ▶ Start Session
                  </button>
                  <button onClick={() => handleDelete(goal.id)}
                    className="text-gray-600 hover:text-red-400 transition-all p-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Study Session View ────────────────────────────────────────────────────────

function StudySessionView({
  session,
  workspaceId,
  onBack,
  onCompleted,
}: {
  session: Session;
  workspaceId: string;
  onBack: () => void;
  onCompleted: (s: Session) => void;
}) {
  const [cards, setCards]         = useState<Flashcard[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [goals, setGoals]         = useState<MicroGoal[]>([]);
  const [loadingContent, setLoadingContent] = useState(true);

  // Flashcard state
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped]     = useState(false);
  const [knownCards, setKnownCards] = useState<Set<string>>(new Set());

  // Quiz state
  const [qIndex, setQIndex]       = useState(0);
  const [selected, setSelected]   = useState<Record<string, string>>({});   // qId → optionId
  const [revealed, setRevealed]   = useState<Set<string>>(new Set());

  // Phase: "cards" | "quiz"
  const [phase, setPhase] = useState<"cards" | "quiz">("cards");

  // Timer
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [completing, setCompleting] = useState(false);
  const autoCompletedRef = useRef(false);

  // Load content
  useEffect(() => {
    (async () => {
      try {
        const [g, c, q] = await Promise.all([
          getMicroGoals(workspaceId),
          session.flashcard_deck_id ? getCards(workspaceId, session.flashcard_deck_id) : Promise.resolve([]),
          session.quiz_set_id ? getQuestions(workspaceId, session.quiz_set_id) : Promise.resolve([]),
        ]);
        setGoals(g);
        setCards(c);
        setQuestions(q);
        // Auto-switch to quiz if no cards
        if (c.length === 0 && q.length > 0) setPhase("quiz");
      } catch { /* silent */ }
      finally { setLoadingContent(false); }
    })();
  }, [workspaceId, session.flashcard_deck_id, session.quiz_set_id]);

  // Start timer
  useEffect(() => {
    if (session.status === "completed") return;
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [session.status]);

  const handleComplete = async () => {
    if (completing) return;
    setCompleting(true);
    try {
      const updated = await updateSession(workspaceId, session.id, {
        status: "completed",
        ended_at: new Date().toISOString(),
      });
      if (timerRef.current) clearInterval(timerRef.current);

      // Determine performance: quiz correct% or cards known%
      const quizCorrect = questions.filter(q =>
        revealed.has(q.id) && q.options.some(o => o.is_correct && o.id === selected[q.id])
      ).length;
      const quizScore  = questions.length > 0 ? quizCorrect / questions.length : null;
      const cardScore  = cards.length > 0 ? knownCards.size / cards.length : null;
      const passed     = (quizScore !== null && quizScore >= 0.7) || (cardScore !== null && cardScore >= 0.7);

      // Advance micro-goal statuses
      const updatedGoals = await Promise.all(
        goals.map(async (g) => {
          if (g.status === "completed") return g;
          const next: MicroGoalStatus = passed ? "completed" : "in_progress";
          if (next === g.status) return g;
          return updateMicroGoal(workspaceId, g.id, { status: next }).catch(() => g);
        })
      );
      setGoals(updatedGoals);

      // Mark workspace completed when every goal is done
      const allDone = updatedGoals.length > 0 && updatedGoals.every(g => g.status === "completed");
      if (allDone) await updateWorkspace(workspaceId, { status: "completed" }).catch(() => {});

      onCompleted(updated);
    } catch { /* silent */ }
    finally { setCompleting(false); }
  };

  // Auto-complete when planned time runs out
  useEffect(() => {
    const timePlanned = (session.planned_duration_minutes ?? 0) * 60;
    if (timePlanned <= 0 || session.status === "completed" || autoCompletedRef.current) return;
    if (elapsed >= timePlanned) {
      autoCompletedRef.current = true;
      handleComplete();
    }
  }, [elapsed]);

  // ── Progress calculations ──────────────────────────────────────────────────
  const cardsDone   = knownCards.size;
  const cardsPct    = cards.length > 0 ? cardsDone / cards.length : null;
  const quizDone    = Object.keys(selected).length;
  const quizPct     = questions.length > 0 ? quizDone / questions.length : null;
  const timePlanned = (session.planned_duration_minutes ?? 0) * 60;
  const timePct     = timePlanned > 0 ? Math.min(elapsed / timePlanned, 1) : null;
  const contentDone = cardsDone + quizDone;
  const contentTotal = cards.length + questions.length;
  const overallPct  = contentTotal > 0 ? Math.round(contentDone / contentTotal * 100) : (timePct !== null ? Math.round(timePct * 100) : 0);

  const completedGoals = goals.filter(g => g.status === "completed").length;
  const missionPct = goals.length > 0 ? Math.round(completedGoals / goals.length * 100) : 0;

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const fmtRemaining = () => {
    if (!session.planned_duration_minutes) return null;
    const rem = Math.max(0, timePlanned - elapsed);
    return fmtTime(rem);
  };

  // ── Flashcard handlers ────────────────────────────────────────────────────
  const card = cards[cardIndex];

  const markKnown = (known: boolean) => {
    if (!card) return;
    setKnownCards(prev => {
      const next = new Set(prev);
      if (known) next.add(card.id); else next.delete(card.id);
      return next;
    });
    setFlipped(false);
    if (cardIndex < cards.length - 1) {
      setCardIndex(i => i + 1);
    } else if (questions.length > 0) {
      setPhase("quiz");
    }
  };

  // ── Quiz handlers ─────────────────────────────────────────────────────────
  const question = questions[qIndex];

  const revealAnswer = () => {
    if (!question) return;
    setRevealed(prev => new Set([...prev, question.id]));
  };

  const nextQuestion = () => {
    if (qIndex < questions.length - 1) setQIndex(i => i + 1);
  };

  // ── Progress bar segment component ───────────────────────────────────────
  const barColors: Record<string, string> = {
    "text-violet-400": "#a78bfa",
    "text-cyan-400":   "#22d3ee",
    "text-amber-400":  "#fbbf24",
    "text-emerald-400":"#34d399",
  };
  const ProgressBar = ({ pct, color, label }: { pct: number; color: string; label: string }) => (
    <div className="flex flex-col gap-1 flex-1 min-w-0">
      <div className="flex justify-between text-xs">
        <span className="text-gray-500">{label}</span>
        <span className={color}>{pct}%</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: barColors[color] ?? "#a78bfa" }} />
      </div>
    </div>
  );

  if (loadingContent) return <div className="text-gray-500 text-sm py-8 text-center">Loading session content…</div>;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-start gap-3">
        <button onClick={onBack} className="mt-1 text-gray-400 hover:text-white transition-colors flex-shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-white truncate">{session.title || "Study Session"}</h3>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-gray-500">
              {session.status === "completed" ? "Completed" : `${fmtTime(elapsed)} elapsed`}
            </span>
            {fmtRemaining() && session.status !== "completed" && (
              <span className="text-xs text-violet-400">{fmtRemaining()} remaining</span>
            )}
          </div>
        </div>
        {session.status !== "completed" && (
          <button
            onClick={handleComplete}
            disabled={completing}
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            {completing ? <span className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" /> : "✓"}
            Complete
          </button>
        )}
      </div>

      {/* ── Progress dashboard ── */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-4">
        {/* Overall ring + stat */}
        <div className="flex items-center gap-4">
          {/* Circle progress */}
          <div className="relative w-16 h-16 flex-shrink-0">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
              <circle cx="32" cy="32" r="26" fill="none" stroke={overallPct >= 80 ? "#34d399" : overallPct >= 40 ? "#a78bfa" : "#6d28d9"}
                strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 26}`}
                strokeDashoffset={`${2 * Math.PI * 26 * (1 - overallPct / 100)}`}
                className="transition-all duration-700" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">{overallPct}%</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white">Session Progress</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {contentTotal > 0
                ? `${contentDone} / ${contentTotal} items completed`
                : session.planned_duration_minutes ? `${fmtTime(elapsed)} of ${session.planned_duration_minutes} min` : "In progress"}
            </p>
          </div>
        </div>

        {/* Segment bars */}
        <div className="flex gap-4">
          {cardsPct !== null && <ProgressBar pct={Math.round(cardsPct * 100)} color="text-violet-400" label={`Cards ${cardsDone}/${cards.length}`} />}
          {quizPct !== null && <ProgressBar pct={Math.round(quizPct * 100)} color="text-cyan-400" label={`Quiz ${quizDone}/${questions.length}`} />}
          {timePct !== null && <ProgressBar pct={Math.round(timePct * 100)} color="text-amber-400" label="Time" />}
        </div>

        {/* Mission progress */}
        {goals.length > 0 && (
          <div className="pt-1 border-t border-white/5 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500 font-semibold uppercase tracking-wider">Mission Progress</span>
              <span className="text-emerald-400">{completedGoals}/{goals.length} goals · {missionPct}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${missionPct}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Phase tabs ── */}
      {cards.length > 0 && questions.length > 0 && (
        <div className="flex gap-2">
          <button onClick={() => setPhase("cards")}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${phase === "cards"
              ? "bg-violet-600 text-white" : "bg-white/5 text-gray-400 border border-white/10 hover:text-white"}`}>
            📚 Flashcards {cardsPct !== null ? `(${cardsDone}/${cards.length})` : ""}
          </button>
          <button onClick={() => setPhase("quiz")}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${phase === "quiz"
              ? "bg-cyan-600 text-white" : "bg-white/5 text-gray-400 border border-white/10 hover:text-white"}`}>
            🧠 Quiz {quizPct !== null ? `(${quizDone}/${questions.length})` : ""}
          </button>
        </div>
      )}

      {/* ── Flashcard panel ── */}
      {phase === "cards" && cards.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <button disabled={cardIndex === 0} onClick={() => { setCardIndex(i => i - 1); setFlipped(false); }}
              className="px-2 py-1 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-colors">← Prev</button>
            <span className="font-semibold">{cardIndex + 1} / {cards.length}</span>
            <button disabled={cardIndex === cards.length - 1} onClick={() => { setCardIndex(i => i + 1); setFlipped(false); }}
              className="px-2 py-1 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-colors">Next →</button>
          </div>

          {/* Card */}
          <button
            onClick={() => setFlipped(f => !f)}
            className={`relative min-h-44 w-full rounded-2xl border p-6 text-left transition-all duration-300 cursor-pointer select-none ${
              knownCards.has(card.id)
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-white/[0.03] border-white/10 hover:border-white/20"
            }`}
          >
            <div className="absolute top-3 right-3 text-xs text-gray-600">{flipped ? "Back" : "Front"} · tap to flip</div>
            {knownCards.has(card.id) && <span className="absolute top-3 left-3 text-emerald-400 text-xs font-semibold">✓ Known</span>}
            <p className="text-sm text-white leading-relaxed mt-4">
              {flipped ? card.back_content : card.front_content}
            </p>
            {!flipped && card.hint && (
              <p className="text-xs text-gray-600 mt-3 italic">Hint: {card.hint}</p>
            )}
          </button>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => markKnown(false)}
              className="py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-sm font-semibold transition-colors">
              ✗ Still Learning
            </button>
            <button onClick={() => markKnown(true)}
              className="py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-sm font-semibold transition-colors">
              ✓ Know It!
            </button>
          </div>

          {cards.length > 0 && cardsDone === cards.length && (
            <p className="text-center text-xs text-emerald-400 font-semibold py-2">
              🎉 All cards reviewed! {questions.length > 0 ? "Move to the quiz →" : "Complete your session!"}
            </p>
          )}
        </div>
      )}

      {/* ── Quiz panel ── */}
      {phase === "quiz" && questions.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <button disabled={qIndex === 0} onClick={() => { setQIndex(i => i - 1); }}
              className="px-2 py-1 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-colors">← Prev</button>
            <span className="font-semibold">Question {qIndex + 1} / {questions.length}</span>
            <button disabled={qIndex === questions.length - 1} onClick={nextQuestion}
              className="px-2 py-1 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-colors">Next →</button>
          </div>

          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-4">
            <p className="text-sm font-semibold text-white leading-relaxed">{question.question_text}</p>

            <div className="flex flex-col gap-2">
              {question.options.map(opt => {
                const isSelected = selected[question.id] === opt.id;
                const isRevealed = revealed.has(question.id);
                const isCorrect  = opt.is_correct;
                let cls = "flex items-start gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all cursor-pointer ";
                if (isRevealed) {
                  if (isCorrect)      cls += "bg-emerald-500/10 border-emerald-500/30 text-emerald-300";
                  else if (isSelected) cls += "bg-red-500/10 border-red-500/30 text-red-300";
                  else                 cls += "bg-white/[0.02] border-white/5 text-gray-500";
                } else if (isSelected) {
                  cls += "bg-violet-500/15 border-violet-500/40 text-white";
                } else {
                  cls += "bg-white/[0.03] border-white/5 text-gray-300 hover:border-white/15 hover:text-white";
                }
                return (
                  <button key={opt.id} onClick={() => !revealed.has(question.id) && setSelected(prev => ({ ...prev, [question.id]: opt.id }))}
                    className={cls} disabled={revealed.has(question.id)}>
                    <span className="flex-shrink-0 w-5 h-5 rounded-full border border-current flex items-center justify-center text-xs mt-0.5">
                      {isRevealed ? (isCorrect ? "✓" : isSelected ? "✗" : "") : (isSelected ? "●" : "")}
                    </span>
                    <span>{opt.option_text}</span>
                  </button>
                );
              })}
            </div>

            {!revealed.has(question.id) ? (
              <button
                onClick={revealAnswer}
                disabled={!selected[question.id]}
                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold disabled:opacity-40 transition-colors"
              >
                Check Answer
              </button>
            ) : (
              <div className="space-y-3">
                {question.explanation && (
                  <p className="text-xs text-gray-400 bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2">
                    💡 {question.explanation}
                  </p>
                )}
                {qIndex < questions.length - 1 && (
                  <button onClick={nextQuestion}
                    className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm hover:border-white/20 transition-colors">
                    Next Question →
                  </button>
                )}
              </div>
            )}
          </div>

          {quizDone === questions.length && (
            <p className="text-center text-xs text-emerald-400 font-semibold py-2">
              🎉 Quiz complete! Score: {Math.round(
                questions.filter(q => revealed.has(q.id) && q.options.some(o => o.is_correct && o.id === selected[q.id])).length
                / questions.length * 100
              )}%
            </p>
          )}
        </div>
      )}

      {/* No content */}
      {!loadingContent && cards.length === 0 && questions.length === 0 && (
        <div className="text-center py-10 text-gray-500 text-sm">
          <p className="text-3xl mb-2">📖</p>
          <p>This session has no linked flashcards or quiz.</p>
          <p className="text-xs mt-1 text-gray-600">Generate a study session to get linked content.</p>
        </div>
      )}

      {session.status === "completed" && (
        <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl text-center">
          <p className="text-emerald-400 font-semibold text-sm">Session completed ✓</p>
          <p className="text-xs text-gray-500 mt-1">Great work! Your progress has been saved.</p>
        </div>
      )}
    </div>
  );
}

// ── Sessions Tab ──────────────────────────────────────────────────────────────

function SessionsTab({
  workspaceId,
  initialGoal,
  onConsumed,
}: {
  workspaceId: string;
  initialGoal?: MicroGoal | null;
  onConsumed?: () => void;
}) {
  const [sessions, setSessions]           = useState<Session[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [showNew, setShowNew]             = useState(false);
  const [newTitle, setNewTitle]           = useState("");
  const [newDuration, setNewDuration]     = useState(60);
  const [creating, setCreating]           = useState(false);
  const [suggestion, setSuggestion]       = useState<SuggestSessionResponse | null>(null);
  const [suggesting, setSuggesting]       = useState(false);
  const [suggestMinutes, setSuggestMinutes] = useState(60);

  // ── Study session builder state ──
  const [showBuilder, setShowBuilder]         = useState(false);
  const [sourceMode, setSourceMode]           = useState<"goal" | "summary">("summary");
  const [roadmapGoals, setRoadmapGoals]       = useState<MicroGoal[]>([]);
  const [goalsLoading, setGoalsLoading]       = useState(false);
  const [selectedGoal, setSelectedGoal]       = useState<MicroGoal | null>(null);
  const [builderSummary, setBuilderSummary]   = useState("");
  const [builderMode, setBuilderMode]         = useState<"auto" | "manual">("auto");
  const [fcDiff, setFcDiff]                   = useState<Difficulty>("normal");
  const [fcCount, setFcCount]                 = useState(10);
  const [qzDiff, setQzDiff]                   = useState<Difficulty>("normal");
  const [qzCount, setQzCount]                 = useState(5);
  const [sessionDuration, setSessionDuration] = useState(60);
  const [building, setBuilding]               = useState(false);
  const [buildError, setBuildError]           = useState("");
  const [buildResult, setBuildResult]         = useState<import("../api/ai").GenerateStudySessionResponse | null>(null);

  const loadRoadmapGoals = async () => {
    setGoalsLoading(true);
    try { setRoadmapGoals(await getMicroGoals(workspaceId)); }
    catch { /* silent */ }
    finally { setGoalsLoading(false); }
  };

  // Open builder when navigating from a micro-goal
  useEffect(() => {
    if (initialGoal) {
      setSourceMode("goal");
      setSelectedGoal(initialGoal);
      setShowBuilder(true);
      loadRoadmapGoals();
      onConsumed?.();
    }
  }, [initialGoal]);

  // Load goals when switching to goal source mode
  const handleSetSourceMode = (mode: "goal" | "summary") => {
    setSourceMode(mode);
    setBuildError(""); setBuildResult(null);
    if (mode === "goal" && roadmapGoals.length === 0) loadRoadmapGoals();
  };

  const load = async () => {
    try { setSessions(await getSessions(workspaceId)); }
    catch { /* silent */ }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [workspaceId]);

  const handleCreate = async () => {
    setCreating(true); setError("");
    try {
      await createSession(workspaceId, {
        title: newTitle.trim() || undefined,
        planned_duration_minutes: newDuration,
      });
      setNewTitle(""); setShowNew(false); await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally { setCreating(false); }
  };

  const handleComplete = async (s: Session) => {
    try {
      await updateSession(workspaceId, s.id, { status: "completed", ended_at: new Date().toISOString() });
      await load();
    } catch { /* silent */ }
  };

  const handleDelete = async (s: Session) => {
    if (!confirm(`Delete session "${s.title || "Untitled"}"?`)) return;
    try { await deleteSession(workspaceId, s.id); await load(); }
    catch { /* silent */ }
  };

  const handleSuggest = async () => {
    setSuggesting(true); setError(""); setSuggestion(null);
    try { setSuggestion(await aiSuggestSession(workspaceId, { available_minutes: suggestMinutes })); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Suggestion failed. Generate a roadmap first."); }
    finally { setSuggesting(false); }
  };

  const handleCreateFromSuggestion = async () => {
    if (!suggestion) return;
    setCreating(true);
    try {
      await createSession(workspaceId, { title: suggestion.title, planned_duration_minutes: suggestMinutes });
      setSuggestion(null); await load();
    } catch { /* silent */ }
    finally { setCreating(false); }
  };

  const handleBuild = async () => {
    if (sourceMode === "goal" && !selectedGoal) {
      setBuildError("Select a goal from the list above."); return;
    }
    setBuilding(true); setBuildError(""); setBuildResult(null);
    try {
      const goalContext = selectedGoal && sourceMode === "goal"
        ? [selectedGoal.title, selectedGoal.description].filter(Boolean).join("\n")
        : undefined;
      const res = await aiGenerateStudySession(workspaceId, {
        summary: sourceMode === "summary" ? (builderSummary.trim() || undefined) : undefined,
        goal_context: goalContext,
        mode: builderMode,
        ...(builderMode === "manual" ? {
          flashcard_difficulty: fcDiff,
          flashcard_count: fcCount,
          quiz_difficulty: qzDiff,
          quiz_count: qzCount,
          session_duration_minutes: sessionDuration,
        } : {}),
      });
      setBuildResult(res);
      setBuilderSummary("");
      await load();
    } catch (e: unknown) {
      setBuildError(e instanceof Error ? e.message : "Generation failed.");
    } finally { setBuilding(false); }
  };

  const diffCls = (active: boolean) =>
    active
      ? "px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30"
      : "px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 text-gray-400 border border-white/10 hover:text-white transition-colors";

  const sColor = (s: string) => {
    if (s === "completed") return "text-emerald-400 bg-emerald-400/10";
    if (s === "active")    return "text-blue-400 bg-blue-400/10";
    if (s === "paused")    return "text-amber-400 bg-amber-400/10";
    return "text-gray-500 bg-gray-500/10";
  };

  const fmtDur = (s: Session) => {
    if (s.ended_at && s.started_at) {
      const m = Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000);
      return `${m}m`;
    }
    return s.planned_duration_minutes ? `${s.planned_duration_minutes}m planned` : "";
  };

  // ── Study view ────────────────────────────────────────────────────────────
  if (activeSession) {
    return (
      <StudySessionView
        session={activeSession}
        workspaceId={workspaceId}
        onBack={() => setActiveSession(null)}
        onCompleted={(updated) => {
          setSessions(prev => prev.map(s => s.id === updated.id ? updated : s));
          setActiveSession(updated);
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Study Session Builder ── */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
        {/* Header */}
        <button
          onClick={() => { setShowBuilder(v => !v); setBuildResult(null); setBuildError(""); }}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.03] transition-colors"
        >
          <div>
            <p className="text-sm font-semibold text-white">Generate Study Session</p>
            <p className="text-xs text-gray-500 mt-0.5">Build a complete study plan — flashcards, quiz, and roadmap goals</p>
          </div>
          <span className={`text-gray-400 transition-transform duration-200 ${showBuilder ? "rotate-180" : ""}`}>▼</span>
        </button>

        {showBuilder && (
          <div className="px-5 pb-5 flex flex-col gap-5 border-t border-white/5 pt-5">

            {/* ── Source mode toggle ── */}
            <div className="flex gap-2">
              <button
                onClick={() => handleSetSourceMode("goal")}
                className={`flex-1 flex flex-col items-center gap-1 py-3 px-3 rounded-xl text-sm font-semibold border transition-all ${
                  sourceMode === "goal"
                    ? "bg-violet-600/20 text-violet-300 border-violet-500/40 shadow-inner"
                    : "bg-white/5 text-gray-400 border-white/10 hover:text-white hover:border-white/20"
                }`}
              >
                <span className="text-lg">🎯</span>
                <span>From Goal</span>
                <span className="text-xs font-normal opacity-70">pick a roadmap goal</span>
              </button>
              <button
                onClick={() => handleSetSourceMode("summary")}
                className={`flex-1 flex flex-col items-center gap-1 py-3 px-3 rounded-xl text-sm font-semibold border transition-all ${
                  sourceMode === "summary"
                    ? "bg-violet-600/20 text-violet-300 border-violet-500/40 shadow-inner"
                    : "bg-white/5 text-gray-400 border-white/10 hover:text-white hover:border-white/20"
                }`}
              >
                <span className="text-lg">📄</span>
                <span>From Summary</span>
                <span className="text-xs font-normal opacity-70">paste or auto-load</span>
              </button>
            </div>

            {/* ── Goal picker ── */}
            {sourceMode === "goal" && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Select a Roadmap Goal</p>
                {goalsLoading ? (
                  <p className="text-xs text-gray-500 py-2">Loading goals…</p>
                ) : roadmapGoals.length === 0 ? (
                  <p className="text-xs text-gray-600 bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3">
                    No roadmap goals yet. Generate a roadmap in the Road Map tab first.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-0.5">
                    {roadmapGoals.map(goal => {
                      const isSelected = selectedGoal?.id === goal.id;
                      return (
                        <button
                          key={goal.id}
                          onClick={() => { setSelectedGoal(isSelected ? null : goal); setBuildError(""); setBuildResult(null); }}
                          className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                            isSelected
                              ? "bg-violet-500/15 border-violet-500/40 text-white"
                              : "bg-white/[0.03] border-white/5 text-gray-300 hover:border-white/15 hover:text-white"
                          }`}
                        >
                          <span className="mt-0.5 text-sm flex-shrink-0">{isSelected ? "✓" : "○"}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-snug">{goal.title}</p>
                            {goal.description && (
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{goal.description}</p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                {selectedGoal && (
                  <p className="text-xs text-gray-600 pl-1">
                    Workspace document summaries will be used as content source.
                  </p>
                )}
              </div>
            )}

            {/* ── Summary input ── */}
            {sourceMode === "summary" && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Summary</p>
                <textarea
                  value={builderSummary}
                  onChange={e => { setBuilderSummary(e.target.value); setBuildError(""); setBuildResult(null); }}
                  placeholder="Paste your document summary here, or leave blank to auto-load from all workspace documents…"
                  rows={5}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.07] resize-none transition-colors"
                />
                <p className="text-xs text-gray-600 pl-1">Leave blank to use all workspace document summaries automatically.</p>
              </div>
            )}

            {/* ── AI mode: Full Auto / Custom ── */}
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <button onClick={() => setBuilderMode("auto")}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${builderMode === "auto"
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                    : "bg-white/5 text-gray-400 border border-white/10 hover:text-white"}`}>
                  ✨ Full Auto
                </button>
                <button onClick={() => setBuilderMode("manual")}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${builderMode === "manual"
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                    : "bg-white/5 text-gray-400 border border-white/10 hover:text-white"}`}>
                  ⚙️ Custom
                </button>
              </div>

              {builderMode === "auto" && (
                <p className="text-xs text-gray-500 bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3">
                  AI will automatically choose the best flashcard count, quiz count, difficulty levels, and session duration.
                </p>
              )}

              {builderMode === "manual" && (
                <div className="flex flex-col gap-4 bg-white/[0.03] border border-white/5 rounded-xl px-4 py-4">
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Flashcards</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex gap-1">
                        {(["easy","normal","hard"] as const).map(d => (
                          <button key={d} onClick={() => setFcDiff(d)} className={diffCls(fcDiff === d)}>{d}</button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 ml-auto">
                        <span className="text-xs text-gray-500">Count</span>
                        <input type="number" min={5} max={20} value={fcCount}
                          onChange={e => setFcCount(Math.min(20, Math.max(5, Number(e.target.value))))}
                          className="w-16 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white text-center focus:outline-none focus:border-violet-500/50" />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Quiz</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex gap-1">
                        {(["easy","normal","hard"] as const).map(d => (
                          <button key={d} onClick={() => setQzDiff(d)} className={diffCls(qzDiff === d)}>{d}</button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 ml-auto">
                        <span className="text-xs text-gray-500">Questions</span>
                        <input type="number" min={3} max={15} value={qzCount}
                          onChange={e => setQzCount(Math.min(15, Math.max(3, Number(e.target.value))))}
                          className="w-16 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white text-center focus:outline-none focus:border-violet-500/50" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Session Duration</p>
                    <div className="flex items-center gap-2">
                      <input type="number" min={20} max={120} step={5} value={sessionDuration}
                        onChange={e => setSessionDuration(Math.min(120, Math.max(20, Number(e.target.value))))}
                        className="w-20 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white text-center focus:outline-none focus:border-violet-500/50" />
                      <span className="text-xs text-gray-500">min</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {buildError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{buildError}</p>}

            <button
              onClick={handleBuild}
              disabled={building}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {building
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Building…</>
                : "Generate Study Session"}
            </button>

            {buildResult && (
              <div className="flex flex-col gap-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  <p className="text-sm font-semibold text-white">{buildResult.session_title}</p>
                  <span className="ml-auto text-xs text-emerald-400 font-semibold">{buildResult.duration_minutes} min</span>
                </div>
                {buildResult.focus_summary && <p className="text-xs text-gray-400">{buildResult.focus_summary}</p>}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white/5 rounded-lg py-2">
                    <p className="text-white font-bold text-base">{buildResult.cards_created}</p>
                    <p className="text-gray-500 mt-0.5">flashcards</p>
                    <p className="text-violet-400 capitalize">{buildResult.flashcard_difficulty}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg py-2">
                    <p className="text-white font-bold text-base">{buildResult.questions_created}</p>
                    <p className="text-gray-500 mt-0.5">quiz Qs</p>
                    <p className="text-violet-400 capitalize">{buildResult.quiz_difficulty}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg py-2">
                    <p className="text-white font-bold text-base">{buildResult.goals_created}</p>
                    <p className="text-gray-500 mt-0.5">new goals</p>
                    <p className="text-violet-400">added</p>
                  </div>
                </div>
                {buildResult.tips.length > 0 && (
                  <div className="flex flex-col gap-1">
                    {buildResult.tips.map((tip, i) => (
                      <p key={i} className="text-xs text-gray-400 flex gap-2">
                        <span className="text-emerald-400 flex-shrink-0">•</span>{tip}
                      </p>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => {
                    const s = sessions.find(s => s.id === buildResult.session_id);
                    if (s) { setActiveSession(s); setShowBuilder(false); setBuildResult(null); }
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  ▶ Start Studying
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Quick session / AI suggest bar ── */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => setShowNew(v => !v)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm hover:border-white/30 transition-colors">
          + New Session
        </button>
        <div className="flex items-center gap-2">
          <input type="number" min={15} max={480} value={suggestMinutes}
            onChange={e => setSuggestMinutes(Math.min(480, Math.max(15, Number(e.target.value))))}
            className="w-16 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-sm text-white text-center focus:outline-none focus:border-violet-500 transition-colors" />
          <span className="text-xs text-gray-500">min</span>
        </div>
        <button onClick={handleSuggest} disabled={suggesting}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium disabled:opacity-50 transition-colors">
          {suggesting
            ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Thinking…</>
            : "✨ AI Suggest"}
        </button>
      </div>

      {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>}

      {showNew && (
        <div className="p-4 bg-white/[0.03] border border-white/10 rounded-xl space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">New Session</p>
          <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)}
            placeholder="Session title (optional)"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors" />
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-500 flex-shrink-0">Duration (min)</label>
            <input type="number" min={1} max={480} value={newDuration}
              onChange={e => setNewDuration(Math.min(480, Math.max(1, Number(e.target.value))))}
              className="w-20 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500 transition-colors" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={creating}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium disabled:opacity-50 transition-colors">
              {creating ? "Creating…" : "Create"}
            </button>
            <button onClick={() => setShowNew(false)}
              className="px-4 py-2 rounded-xl bg-white/5 text-gray-400 text-sm hover:text-white transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {suggestion && (
        <div className="p-4 bg-violet-500/5 border border-violet-500/20 rounded-xl space-y-3">
          <div className="flex items-center gap-2">
            <span>✨</span>
            <p className="text-sm font-semibold text-white">{suggestion.title}</p>
          </div>
          <p className="text-sm text-gray-400">{suggestion.focus_summary}</p>
          {suggestion.tips.length > 0 && (
            <ul className="space-y-1">
              {suggestion.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
                  <span className="text-violet-400 mt-0.5">•</span>{tip}
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={handleCreateFromSuggestion} disabled={creating}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium disabled:opacity-50 transition-colors">
              {creating ? "Creating…" : "Start This Session"}
            </button>
            <button onClick={() => setSuggestion(null)}
              className="px-4 py-2 rounded-xl bg-white/5 text-gray-400 text-sm hover:text-white transition-colors">Dismiss</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-gray-500 text-sm">Loading…</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-10 text-gray-500 text-sm">
          <p className="text-3xl mb-2">⏱️</p>
          <p>No sessions yet. Start your first study session.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map(s => {
            const hasContent = !!(s.flashcard_deck_id || s.quiz_set_id);
            return (
              <div key={s.id} className={`flex items-center gap-3 p-3 rounded-xl border group transition-colors ${
                hasContent ? "bg-white/5 border-white/10 hover:border-violet-500/30 cursor-pointer" : "bg-white/5 border-white/5"
              }`}
                onClick={hasContent ? () => setActiveSession(s) : undefined}
              >
                {/* Status dot */}
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  s.status === "completed" ? "bg-emerald-400" :
                  s.status === "active" ? "bg-violet-400 animate-pulse" : "bg-gray-600"
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-white truncate">{s.title || "Untitled Session"}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${sColor(s.status)}`}>{s.status}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {fmtDate(s.started_at)}{fmtDur(s) ? ` · ${fmtDur(s)}` : ""}
                    {hasContent && <span className="ml-2 text-violet-500">📚 flashcards + quiz</span>}
                  </p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {hasContent && (
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      ▶ Study
                    </span>
                  )}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    {s.status !== "completed" && (
                      <button onClick={() => handleComplete(s)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                        ✓
                      </button>
                    )}
                    <button onClick={() => handleDelete(s)} className="p-1 text-gray-600 hover:text-red-400 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
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

const DIFFICULTIES: { value: Difficulty; label: string; color: string }[] = [
  { value: "easy",   label: "Easy",   color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" },
  { value: "normal", label: "Normal", color: "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20" },
  { value: "hard",   label: "Hard",   color: "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20" },
];

function FlashcardsTab({ workspaceId }: { workspaceId: string }) {
  const [decks, setDecks]         = useState<FlashcardDeck[]>([]);
  const [summary, setSummary]     = useState("");
  const [difficulty, setDiff]     = useState<Difficulty>("normal");
  const [deckTitle, setTitle]     = useState("AI Flashcards");
  const [count, setCount]         = useState(15);
  const [generating, setGen]      = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");
  const [studyDeck, setStudyDeck] = useState<FlashcardDeck | null>(null);

  const loadDecks = () =>
    getDecks(workspaceId).then(setDecks).catch(() => {});

  useEffect(() => { loadDecks(); }, [workspaceId]);

  const handleGenerate = async () => {
    if (summary.trim().length < 50) {
      setError("Please paste a summary of at least 50 characters."); return;
    }
    setGen(true); setError(""); setSuccess("");
    try {
      const res = await aiGenerateFlashcards(workspaceId, {
        summary: summary.trim(),
        difficulty,
        deck_title: deckTitle.trim() || "AI Flashcards",
        count,
      });
      setSuccess(`Created "${res.deck_title}" with ${res.cards_created} cards.`);
      setSummary("");
      await loadDecks();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setGen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Generation panel */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-base">🃏</span>
          <h3 className="text-sm font-semibold text-white">Generate Flashcards with AI</h3>
        </div>

        <div className="space-y-3">
          {/* Summary input */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Summary text <span className="normal-case text-gray-600">(paste from the Summary tab)</span>
            </label>
            <textarea
              value={summary}
              onChange={e => { setSummary(e.target.value); setError(""); }}
              placeholder="Paste the AI-generated summary here, or write your own study notes…"
              rows={5}
              className="mt-1.5 w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.07] resize-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Deck title */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Deck title</label>
              <input
                type="text"
                value={deckTitle}
                onChange={e => setTitle(e.target.value)}
                maxLength={200}
                className="mt-1.5 w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors"
              />
            </div>
            {/* Card count */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Cards (5–30)</label>
              <input
                type="number" min={5} max={30} value={count}
                onChange={e => setCount(Math.min(30, Math.max(5, Number(e.target.value))))}
                className="mt-1.5 w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Difficulty</label>
            <div className="mt-1.5 flex gap-2">
              {DIFFICULTIES.map(d => (
                <button
                  key={d.value}
                  onClick={() => setDiff(d.value)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    difficulty === d.value ? d.color : "bg-white/5 border-white/10 text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {error   && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>}
          {success && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg">✓ {success}</p>}

          <button
            onClick={handleGenerate}
            disabled={generating || summary.trim().length < 50}
            className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {generating ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Generating…</>
            ) : "✨ Generate Flashcards"}
          </button>
        </div>
      </div>

      {/* Existing decks */}
      {studyDeck && (
        <FlashcardStudyModal workspaceId={workspaceId} deck={studyDeck} onClose={() => setStudyDeck(null)} />
      )}
      {decks.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Saved Decks</p>
          {decks.map(deck => (
            <div key={deck.id} className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl border border-white/5">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0 text-sm">🃏</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{deck.title}</p>
                <p className="text-xs text-gray-600">{fmtDate(deck.created_at)}</p>
              </div>
              <button onClick={() => setStudyDeck(deck)}
                className="text-xs px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors flex-shrink-0">
                Study →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Quizzes Tab ───────────────────────────────────────────────────────────────

function QuizzesTab({ workspaceId }: { workspaceId: string }) {
  const [quizSets, setQuizSets]       = useState<QuizSet[]>([]);
  const [summary, setSummary]         = useState("");
  const [difficulty, setDiff]         = useState<Difficulty>("normal");
  const [quizTitle, setTitle]         = useState("AI Quiz");
  const [count, setCount]             = useState(10);
  const [generating, setGen]          = useState(false);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState("");
  const [quizToSolve, setQuizToSolve] = useState<QuizSet | null>(null);

  const loadQuizSets = () =>
    getQuizSets(workspaceId).then(setQuizSets).catch(() => {});

  useEffect(() => { loadQuizSets(); }, [workspaceId]);

  const handleGenerate = async () => {
    if (summary.trim().length < 50) {
      setError("Please paste a summary of at least 50 characters."); return;
    }
    setGen(true); setError(""); setSuccess("");
    try {
      const res = await aiGenerateQuiz(workspaceId, {
        summary: summary.trim(),
        difficulty,
        quiz_title: quizTitle.trim() || "AI Quiz",
        count,
      });
      setSuccess(`Created "${res.quiz_title}" with ${res.questions_created} questions.`);
      setSummary("");
      await loadQuizSets();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setGen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Generation panel */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-base">📝</span>
          <h3 className="text-sm font-semibold text-white">Generate Quiz with AI</h3>
        </div>

        <div className="space-y-3">
          {/* Summary input */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Summary text <span className="normal-case text-gray-600">(paste from the Summary tab)</span>
            </label>
            <textarea
              value={summary}
              onChange={e => { setSummary(e.target.value); setError(""); }}
              placeholder="Paste the AI-generated summary here, or write your own study notes…"
              rows={5}
              className="mt-1.5 w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.07] resize-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Quiz title */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Quiz title</label>
              <input
                type="text"
                value={quizTitle}
                onChange={e => setTitle(e.target.value)}
                maxLength={200}
                className="mt-1.5 w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors"
              />
            </div>
            {/* Question count */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Questions (3–20)</label>
              <input
                type="number" min={3} max={20} value={count}
                onChange={e => setCount(Math.min(20, Math.max(3, Number(e.target.value))))}
                className="mt-1.5 w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Difficulty</label>
            <div className="mt-1.5 flex gap-2">
              {DIFFICULTIES.map(d => (
                <button
                  key={d.value}
                  onClick={() => setDiff(d.value)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    difficulty === d.value ? d.color : "bg-white/5 border-white/10 text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {error   && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>}
          {success && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg">✓ {success}</p>}

          <button
            onClick={handleGenerate}
            disabled={generating || summary.trim().length < 50}
            className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {generating ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Generating…</>
            ) : "✨ Generate Quiz"}
          </button>
        </div>
      </div>

      {/* Existing quiz sets */}
      {quizToSolve && (
        <QuizSolveModal workspaceId={workspaceId} quizSet={quizToSolve} onClose={() => setQuizToSolve(null)} />
      )}
      {quizSets.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Saved Quizzes</p>
          {quizSets.map(qs => (
            <div key={qs.id} className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl border border-white/5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 text-sm">📝</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{qs.title}</p>
                <p className="text-xs text-gray-600">{fmtDate(qs.created_at)}</p>
              </div>
              <button onClick={() => setQuizToSolve(qs)}
                className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors flex-shrink-0">
                Take Quiz →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── AI Chat Tab ───────────────────────────────────────────────────────────────

function AIChatTab({ workspaceId, workspaceTitle }: { workspaceId: string; workspaceTitle: string }) {
  const [messages, setMessages]     = useState<AIChatMessage[]>([]);
  const [input, setInput]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [histLoading, setHistLoading] = useState(true);
  const bottomRef                   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getChatHistory(workspaceId)
      .then(setMessages)
      .catch(() => {})
      .finally(() => setHistLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const content = input.trim();
    setInput("");
    setLoading(true);
    try {
      const newMsgs = await sendChatMessage(workspaceId, content);
      setMessages(prev => [...prev, ...newMsgs]);
    } catch {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        workspace_id: workspaceId,
        user_id: "",
        role: "assistant" as const,
        content: "I'm having trouble connecting to the AI service. Please check that your OpenAI API key is configured correctly.",
        created_at: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!confirm("Clear all chat history?")) return;
    await clearChatHistory(workspaceId).catch(() => {});
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-[60vh] rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
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
        {messages.length > 0 && (
          <button onClick={handleClear} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Clear</button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {histLoading ? (
          <div className="flex items-center justify-center h-full text-gray-600 text-sm">Loading history…</div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-medium">Ask your AI tutor</p>
              <p className="text-sm text-gray-500 mt-1 max-w-xs">Explain concepts, generate practice questions, or get study tips for this workspace.</p>
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
        ) : (
          messages.map(msg => (
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
          ))
        )}

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

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2 p-3 border-t border-white/10 flex-shrink-0">
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask something…"
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors" />
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

// ── Flashcard Study Modal ──────────────────────────────────────────────────────

function FlashcardStudyModal({ workspaceId, deck, onClose }: { workspaceId: string; deck: FlashcardDeck; onClose: () => void }) {
  const [cards, setCards]       = useState<Flashcard[]>([]);
  const [index, setIndex]       = useState(0);
  const [flipped, setFlipped]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const [mastered, setMastered] = useState(0);
  const [done, setDone]         = useState(false);

  useEffect(() => {
    getCards(workspaceId, deck.id).then(setCards).catch(() => {}).finally(() => setLoading(false));
  }, [workspaceId, deck.id]);

  const current = cards[index];

  const advance = (gotIt: boolean) => {
    if (gotIt) {
      updateCard(workspaceId, deck.id, current.id, { is_mastered: true }).catch(() => {});
      setMastered(m => m + 1);
    }
    if (index + 1 >= cards.length) setDone(true);
    else { setIndex(i => i + 1); setFlipped(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 rounded-2xl border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <p className="text-sm font-semibold text-white">{deck.title}</p>
            {!done && cards.length > 0 && <p className="text-xs text-gray-500">{index + 1} / {cards.length}</p>}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {loading ? (
          <div className="p-10 text-center text-gray-500 text-sm">Loading cards…</div>
        ) : cards.length === 0 ? (
          <div className="p-10 text-center text-gray-500 text-sm">No cards in this deck.</div>
        ) : done ? (
          <div className="p-10 text-center space-y-4">
            <div className="text-5xl">🎉</div>
            <div>
              <p className="text-lg font-bold text-white">Deck Complete!</p>
              <p className="text-sm text-gray-400 mt-1">You mastered {mastered} of {cards.length} cards.</p>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${Math.round((mastered / cards.length) * 100)}%` }} />
            </div>
            <button onClick={onClose} className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors">Done</button>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            <div className="w-full bg-white/5 rounded-full h-1">
              <div className="bg-violet-500 h-1 rounded-full" style={{ width: `${Math.round((index / cards.length) * 100)}%` }} />
            </div>
            <button onClick={() => setFlipped(f => !f)}
              className={`w-full min-h-44 p-6 rounded-2xl border-2 text-left transition-all ${
                flipped ? "bg-violet-500/10 border-violet-500/30" : "bg-white/[0.03] border-white/10 hover:border-white/20"
              }`}>
              <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${flipped ? "text-violet-400" : "text-gray-500"}`}>
                {flipped ? "Answer" : "Question"}
              </p>
              <p className="text-white text-base leading-relaxed">{flipped ? current.back_content : current.front_content}</p>
              {!flipped && current.hint && <p className="mt-3 text-xs text-gray-600 italic">Hint: {current.hint}</p>}
              {!flipped && <p className="mt-4 text-xs text-gray-600">Tap to reveal answer</p>}
            </button>
            {flipped ? (
              <div className="flex gap-3">
                <button onClick={() => advance(false)}
                  className="flex-1 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors">
                  Still Learning
                </button>
                <button onClick={() => advance(true)}
                  className="flex-1 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-colors">
                  Got It ✓
                </button>
              </div>
            ) : (
              <button onClick={() => setFlipped(true)}
                className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors">
                Reveal Answer
              </button>
            )}
            <button onClick={() => advance(false)} className="w-full text-xs text-gray-600 hover:text-gray-400 transition-colors">Skip →</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Quiz Solve Modal ───────────────────────────────────────────────────────────

function QuizSolveModal({ workspaceId, quizSet, onClose }: { workspaceId: string; quizSet: QuizSet; onClose: () => void }) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [attempt, setAttempt]     = useState<QuizAttempt | null>(null);
  const [index, setIndex]         = useState(0);
  const [selected, setSelected]   = useState<string | null>(null);
  const [answered, setAnswered]   = useState(false);
  const [correct, setCorrect]     = useState(0);
  const [loading, setLoading]     = useState(true);
  const [done, setDone]           = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [qs, att] = await Promise.all([
          getQuestions(workspaceId, quizSet.id),
          startAttempt(workspaceId, quizSet.id, {}),
        ]);
        setQuestions(qs); setAttempt(att);
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, [workspaceId, quizSet.id]);

  const cur = questions[index];

  const handleSelect = async (opt: QuizOption) => {
    if (answered || submitting || !attempt) return;
    setSelected(opt.id); setAnswered(true); setSubmitting(true);
    if (opt.is_correct) setCorrect(c => c + 1);
    try {
      await submitAnswer(workspaceId, quizSet.id, attempt.id, {
        question_id: cur.id,
        selected_option_id: opt.id,
      });
    } catch { /* silent */ }
    finally { setSubmitting(false); }
  };

  const handleNext = async () => {
    if (index + 1 >= questions.length) {
      const pct = Math.round((correct / questions.length) * 100);
      if (attempt) {
        await updateAttempt(workspaceId, quizSet.id, attempt.id, {
          status: "completed", score_pct: pct, ended_at: new Date().toISOString(),
        }).catch(() => {});
      }
      setDone(true);
    } else {
      setIndex(i => i + 1); setSelected(null); setAnswered(false);
    }
  };

  const pct = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 rounded-2xl border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <p className="text-sm font-semibold text-white">{quizSet.title}</p>
            {!done && questions.length > 0 && <p className="text-xs text-gray-500">Question {index + 1} of {questions.length}</p>}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {loading ? (
          <div className="p-10 text-center text-gray-500 text-sm">Loading quiz…</div>
        ) : questions.length === 0 ? (
          <div className="p-10 text-center text-gray-500 text-sm">No questions found.</div>
        ) : done ? (
          <div className="p-10 text-center space-y-5">
            <div className="text-5xl">{pct >= 70 ? "🎉" : pct >= 40 ? "📚" : "💪"}</div>
            <div>
              <p className="text-2xl font-bold text-white">{pct}%</p>
              <p className="text-sm text-gray-400 mt-1">{correct} of {questions.length} correct</p>
            </div>
            <div className="w-full bg-white/10 rounded-full h-3">
              <div className={`h-3 rounded-full ${pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                style={{ width: `${pct}%` }} />
            </div>
            <p className="text-sm text-gray-500">
              {pct >= 70 ? "Great work! Keep it up." : pct >= 40 ? "Good effort! Review and try again." : "Keep studying and try again."}
            </p>
            <button onClick={onClose} className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors">Done</button>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-white/5 rounded-full h-1.5">
                <div className="bg-violet-500 h-1.5 rounded-full" style={{ width: `${Math.round((index / questions.length) * 100)}%` }} />
              </div>
              <span className="text-xs text-emerald-400 font-medium">{correct} ✓</span>
            </div>
            <p className="text-white text-base font-medium leading-relaxed">{cur.question_text}</p>
            <div className="space-y-2">
              {cur.options.map(opt => {
                const isSel = selected === opt.id;
                let cls = "bg-white/5 border-white/10 text-gray-300 hover:border-white/30 hover:bg-white/10 cursor-pointer";
                if (answered && opt.is_correct)               cls = "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 cursor-default";
                else if (answered && isSel && !opt.is_correct) cls = "bg-red-500/20 border-red-500/40 text-red-300 cursor-default";
                else if (answered)                             cls = "bg-white/5 border-white/5 text-gray-600 cursor-default";
                return (
                  <button key={opt.id} onClick={() => handleSelect(opt)} disabled={answered || submitting}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${cls}`}>
                    {opt.option_text}
                  </button>
                );
              })}
            </div>
            {answered && cur.explanation && (
              <div className="px-4 py-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
                <p className="text-xs font-semibold text-blue-400 mb-1">Explanation</p>
                <p className="text-sm text-gray-400">{cur.explanation}</p>
              </div>
            )}
            {answered && (
              <button onClick={handleNext}
                className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors">
                {index + 1 >= questions.length ? "See Results" : "Next Question →"}
              </button>
            )}
          </div>
        )}
      </div>
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
    <div className="flex flex-col gap-8 pb-24">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Workspaces</h1>
          <p className="text-sm mt-1 text-gray-500">{workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""} · your long-running study containers</p>
        </div>
        {subjects.length > 0 && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-105 active:scale-95 flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)", boxShadow: "0 4px 20px rgba(139,92,246,0.3)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            New Workspace
          </button>
        )}
      </div>

      {subjects.length === 0 && !loading && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
          Create a subject first before making workspaces.
        </div>
      )}

      {error && <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-sm">{error}</div>}

      {/* Filters */}
      {/* Subject filter pills */}
      {subjects.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setFilterSubject("all")}
            className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
            style={filterSubject === "all"
              ? { background: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.3)" }
              : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.08)" }
            }
          >
            All Subjects
          </button>
          {subjects.map(s => (
            <button
              key={s.id}
              onClick={() => setFilterSubject(s.id)}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              style={filterSubject === s.id
                ? { background: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.3)" }
                : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.08)" }
              }
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "active", "paused", "completed", "canceled"] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize"
            style={filterStatus === s
              ? { background: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.3)" }
              : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.08)" }
            }
          >
            {s}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-6 py-32 text-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
            <svg className="w-10 h-10 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-xl">{workspaces.length === 0 ? "No workspaces yet" : "No matching workspaces"}</p>
            <p className="text-sm mt-1 text-gray-500">{workspaces.length === 0 ? "Create a workspace to get started." : "Try adjusting the filters above."}</p>
          </div>
          {workspaces.length === 0 && subjects.length > 0 && (
            <button onClick={() => setShowCreate(true)}
              className="px-6 py-3 rounded-2xl font-bold text-white transition-colors"
              style={{ background: "#7c3aed" }}>
              Create First Workspace
            </button>
          )}
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
