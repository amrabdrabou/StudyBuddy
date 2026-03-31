import { useEffect, useRef, useState } from "react";
import { useNavStore } from "../store/navStore";
import { updateWorkspace, deleteWorkspace, type Workspace, type WorkspaceStatus } from "../api/workspaces";
import type { Subject } from "../api/subjects";
import { getDocuments, uploadDocument, deleteDocument, getDocumentContent, type Document, type DocumentContent } from "../api/documents";
import CanvasNoteEditor from "../components/canvas/CanvasNoteEditor";
import DocumentCanvasViewer from "../components/canvas/DocumentCanvasViewer";
import { getNotes, createNote, deleteNote, type Note } from "../api/notes";
import { getCards, updateCard, submitReview, type FlashcardDeck, type Flashcard } from "../api/flashcards";
import { getQuestions, startAttempt, submitAnswer, updateAttempt, type QuizSet, type QuizQuestion, type QuizOption, type QuizAttempt } from "../api/quiz";
import {
  aiSummarize,
  aiGenerateStudySession,
  aiSuggestSession,
  type Difficulty,
  type GenerateStudySessionResponse,
  type SuggestSessionResponse,
} from "../api/ai";
import { getMicroGoals, type MicroGoal, type MicroGoalStatus } from "../api/micro_goals";
import { getSessions, createSession, updateSession, deleteSession, type Session } from "../api/sessions";
import { getChatHistory, sendChatMessage, clearChatHistory, type AIChatMessage } from "../api/chat";
import MicroGoalsTab from "../components/workspaces/MicroGoalsTab";
import ErrorBanner from "../components/ui/ErrorBanner";
import MainDetailPage from "../components/ui/MainDetailPage";
import { getWorkspaceStatusClass } from "../components/ui/themeTokens";
import { fmtDate, fmtSize } from "../components/ui/utils";
import { WorkspaceDetailProvider } from "../features/workspaces/context/WorkspaceDetailContext";
import WorkspaceFlashcardsTab from "../features/workspaces/flashcards/FlashcardsTab";
import WorkspaceQuizzesTab from "../features/workspaces/quizzes/QuizzesTab";
import { getSessionProgressSummary } from "../features/workspaces/sessionProgress";

// ── Helpers ───────────────────────────────────────────────────────────────────

const statusColor = getWorkspaceStatusClass;

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
  const { navState, setWorkspaceTab, toGoals, toGoal, toSubject } = useNavStore();
  const tab = (navState.tab as WorkspaceTab | undefined) ?? "documents";
  const [error, setError] = useState("");
  const [sessionGoal, setSessionGoal] = useState<MicroGoal | null>(null);
  const goal = navState.goal;
  const currentSubject = subject ?? navState.subject;

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
    <MainDetailPage
      breadcrumbs={(
        goal && currentSubject ? (
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <button onClick={toGoals} className="text-gray-500 hover:text-white transition-colors">
              Missions
            </button>
            <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
            <button onClick={() => toGoal(goal)} className="text-gray-500 hover:text-white transition-colors truncate max-w-[100px]">
              {goal.title}
            </button>
            <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
            <button onClick={() => toSubject(goal, currentSubject)} className="text-gray-500 hover:text-white transition-colors truncate max-w-[100px]">
              {currentSubject.name}
            </button>
            <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-white font-medium">{workspace.title}</span>
          </div>
        ) : (
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors w-fit">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        )
      )}
      title={workspace.title}
      description={currentSubject?.name}
      meta={<span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(workspace.status)}`}>{workspace.status}</span>}
      icon={(
        <svg className="w-6 h-6 text-violet-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )}
      accentColor="#8b5cf6"
      actions={(
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
      )}
      error={error}
      onDismissError={() => setError("")}
    >
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
      <WorkspaceDetailProvider value={{ workspaceId: workspace.id, workspaceTitle: workspace.title, subjectId: workspace.subject_id }}>
        {tab === "documents"   && <DocumentsTab workspaceId={workspace.id} subjectId={workspace.subject_id} />}
        {tab === "summary"     && <SummaryTab workspaceId={workspace.id} />}
        {tab === "ai-chat"     && <AIChatTab workspaceId={workspace.id} workspaceTitle={workspace.title} />}
        {tab === "micro-goals" && <MicroGoalsTab workspaceId={workspace.id} onStartSession={handleStartSession} />}
        {tab === "sessions"    && <SessionsTab workspaceId={workspace.id} initialGoal={sessionGoal} onConsumed={() => setSessionGoal(null)} />}
        {tab === "flashcards"  && <WorkspaceFlashcardsTab renderStudyModal={(deck, onClose) => deck ? <FlashcardStudyModal workspaceId={workspace.id} deck={deck} onClose={onClose} /> : null} />}
        {tab === "quizzes"     && <WorkspaceQuizzesTab renderQuizModal={(quizSet, onClose) => quizSet ? <QuizSolveModal workspaceId={workspace.id} quizSet={quizSet} onClose={onClose} /> : null} />}
        {tab === "timeline"    && <TimelineTab workspaceId={workspace.id} />}
      </WorkspaceDetailProvider>
    </MainDetailPage>
  );
}

export { WorkspaceDetail as WorkspaceDetailPage };

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

// ── Study Session View ────────────────────────────────────────────────────────

function StudySessionView({
  session,
  workspaceId,
  onBack,
  onCompleted,
  savedProgress,
  onSaveProgress,
}: {
  session: Session;
  workspaceId: string;
  onBack: () => void;
  onCompleted: (s: Session) => void;
  savedProgress?: SavedSessionProgress;
  onSaveProgress?: (p: SavedSessionProgress) => void;
}) {
  const [cards, setCards]         = useState<Flashcard[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [goals, setGoals]         = useState<MicroGoal[]>([]);
  const [loadingContent, setLoadingContent] = useState(true);

  // Flashcard state — restored from savedProgress if available
  const [cardIndex, setCardIndex] = useState(savedProgress?.cardIndex ?? 0);
  const [flipped, setFlipped]     = useState(false);
  const [knownCards, setKnownCards] = useState<Set<string>>(savedProgress?.knownCards ?? new Set());

  // Quiz state — queue-based: wrong answers cycle back until correct
  const [quizQueue, setQuizQueue]           = useState<string[]>([]);    // question IDs left to answer correctly
  const [currentSelected, setCurrentSelected] = useState<string | null>(null); // currently chosen option
  const [currentRevealed, setCurrentRevealed] = useState(false);         // answer shown for current question
  const [correctIds, setCorrectIds]           = useState<Set<string>>(savedProgress?.correctIds ?? new Set()); // permanently correct
  const [quizAttempt, setQuizAttempt] = useState<QuizAttempt | null>(null);

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
        const [g, c, q, att] = await Promise.all([
          getMicroGoals(workspaceId),
          session.flashcard_deck_id ? getCards(workspaceId, session.flashcard_deck_id) : Promise.resolve([]),
          session.quiz_set_id ? getQuestions(workspaceId, session.quiz_set_id) : Promise.resolve([]),
          session.quiz_set_id && session.status !== "completed"
            ? startAttempt(workspaceId, session.quiz_set_id, {}).catch(() => null)
            : Promise.resolve(null),
        ]);
        setGoals(g);
        setCards(c);
        setQuestions(q);
        if (q.length > 0) {
          // Exclude already-correct questions from the initial queue (pause/resume)
          const alreadyCorrect = savedProgress?.correctIds ?? new Set<string>();
          const remaining = q.map(question => question.id).filter(id => !alreadyCorrect.has(id));
          setQuizQueue(remaining.length > 0 ? remaining : q.map(question => question.id));
        }
        if (att) setQuizAttempt(att);
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
      onSaveProgress?.({
        knownCards: new Set(knownCards),
        correctIds: new Set(correctIds),
        cardIndex,
      });

      const updated = await updateSession(workspaceId, session.id, {
        status: "completed",
        ended_at: new Date().toISOString(),
      });
      if (timerRef.current) clearInterval(timerRef.current);

      // Save quiz attempt score (100% by definition when auto-completing)
      if (quizAttempt && questions.length > 0) {
        updateAttempt(workspaceId, session.quiz_set_id!, quizAttempt.id, {
          status: "completed",
          score_pct: Math.round(quizCorrectN / questions.length * 100),
          ended_at: new Date().toISOString(),
        }).catch(() => {});
      }

      // Mark session-linked micro-goals as completed in local state (backend already updated them)
      const linkedIds = new Set((updated.micro_goal_ids ?? []).map(String));
      const updatedGoals = goals.map(g =>
        linkedIds.has(String(g.id)) ? { ...g, status: "completed" as MicroGoalStatus } : g
      );
      setGoals(updatedGoals);

      // Mark workspace completed when every goal is done
      const allDone = updatedGoals.length > 0 && updatedGoals.every(g => g.status === "completed");
      if (allDone) await updateWorkspace(workspaceId, { status: "completed" }).catch(() => {});

      onCompleted(updated);
    } catch { /* silent */ }
    finally { setCompleting(false); }
  };

  // Pause the session (save progress, return to list)
  const handlePause = async () => {
    try {
      await updateSession(workspaceId, session.id, { status: "paused" });
      onSaveProgress?.({ knownCards, correctIds, cardIndex });
      onBack();
    } catch { /* silent */ }
  };

  // Restart: full reset — wipes all progress and starts from scratch
  const handleRestart = async () => {
    const resetKnownCards = new Set<string>();
    const resetCorrectIds = new Set<string>();
    setCardIndex(0);
    setFlipped(false);
    setKnownCards(resetKnownCards);
    setQuizQueue(questions.map(q => q.id));
    setCurrentSelected(null);
    setCurrentRevealed(false);
    setCorrectIds(resetCorrectIds);
    autoCompletedRef.current = false;
    onSaveProgress?.({
      knownCards: resetKnownCards,
      correctIds: resetCorrectIds,
      cardIndex: 0,
    });
    if (session.quiz_set_id) {
      const att = await startAttempt(workspaceId, session.quiz_set_id, {}).catch(() => null);
      if (att) setQuizAttempt(att);
    }
    setPhase(cards.length > 0 ? "cards" : "quiz");
  };

  // ── Progress calculations ──────────────────────────────────────────────────
  const {
    cardsDone,
    cardsPct,
    quizCorrectN,
    quizPct,
    quizScorePct,
    timePct,
    contentTotal,
    isScore100,
    correctItems,
    motivScorePct,
  } = getSessionProgressSummary({
    cardCount: cards.length,
    knownCardCount: knownCards.size,
    questionCount: questions.length,
    correctQuestionCount: correctIds.size,
    elapsedSeconds: elapsed,
    plannedDurationMinutes: session.planned_duration_minutes,
  });

  // Auto-complete when score reaches 100%
  useEffect(() => {
    if (isScore100 && contentTotal > 0 && session.status !== "completed" && !autoCompletedRef.current && !loadingContent) {
      autoCompletedRef.current = true;
      handleComplete();
    }
  }, [isScore100, contentTotal, loadingContent]);

  // Motivational score: correct items / total
  const nextGoal       = goals.find(g => g.status !== "completed");

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const fmtRemaining = () => {
    if (!session.planned_duration_minutes) return null;
    const rem = Math.max(0, session.planned_duration_minutes * 60 - elapsed);
    return fmtTime(rem);
  };

  // ── Flashcard handlers ────────────────────────────────────────────────────
  const card = cards[cardIndex];

  const markKnown = (known: boolean) => {
    if (!card) return;
    // Save review to backend (fire-and-forget)
    const qualityRating = known ? 4 : 1;
    const nextReviewAt = new Date(Date.now() + (known ? 3 : 1) * 24 * 60 * 60 * 1000).toISOString();
    submitReview({
      flashcard_id: card.id,
      session_id: session.id,
      quality_rating: qualityRating,
      next_review_at: nextReviewAt,
    }).catch(() => {});
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
  const question = questions.find(q => q.id === quizQueue[0]) ?? null;
  const isCurrentCorrect = question
    ? question.options.some(o => o.is_correct && o.id === currentSelected)
    : false;

  const revealAnswer = () => {
    if (!question || !currentSelected) return;
    setCurrentRevealed(true);
    // Save to backend on first reveal (fire-and-forget; 409 on retries is silently ignored)
    if (quizAttempt) {
      submitAnswer(workspaceId, session.quiz_set_id!, quizAttempt.id, {
        question_id: question.id,
        selected_option_id: currentSelected,
      }).catch(() => {});
    }
  };

  // Advance the queue: correct → remove from front; wrong → move to back
  const advanceQueue = () => {
    if (!question) return;
    if (isCurrentCorrect) {
      setCorrectIds(prev => new Set([...prev, question.id]));
      setQuizQueue(prev => prev.slice(1));
    } else {
      setQuizQueue(prev => [...prev.slice(1), prev[0]]);
    }
    setCurrentSelected(null);
    setCurrentRevealed(false);
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
            onClick={handlePause}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 text-sm font-semibold transition-colors"
          >
            ⏸ Pause
          </button>
        )}
      </div>

      {/* ── Progress dashboard ── */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-4">
        {/* Overall ring + stat + restart */}
        <div className="flex items-center gap-4">
          {/* Circle progress */}
          <div className="relative w-16 h-16 flex-shrink-0">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
              <circle cx="32" cy="32" r="26" fill="none"
                stroke={motivScorePct >= 80 ? "#34d399" : motivScorePct >= 40 ? "#a78bfa" : "#6d28d9"}
                strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 26}`}
                strokeDashoffset={`${2 * Math.PI * 26 * (1 - motivScorePct / 100)}`}
                className="transition-all duration-700" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">{motivScorePct}%</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white">Score</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {contentTotal > 0
                ? `${correctItems} / ${contentTotal} correct · reach 100% to complete`
                : session.planned_duration_minutes ? `${fmtTime(elapsed)} of ${session.planned_duration_minutes} min` : "In progress"}
            </p>
          </div>
          {/* Restart button */}
          {contentTotal > 0 && (
            <button
              onClick={handleRestart}
              title="Restart — resets progress but keeps your previous scores"
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/25 text-xs font-semibold transition-colors"
            >
              ↺ Retry
            </button>
          )}
        </div>

        {/* Segment bars */}
        <div className="flex gap-4">
          {cardsPct !== null && <ProgressBar pct={Math.round(cardsPct * 100)} color="text-violet-400" label={`Cards ${cardsDone}/${cards.length}`} />}
          {quizScorePct !== null && <ProgressBar pct={Math.round(quizScorePct * 100)} color="text-cyan-400" label={`Quiz ${quizCorrectN}/${questions.length} correct`} />}
          {timePct !== null && <ProgressBar pct={Math.round(timePct * 100)} color="text-amber-400" label="Time" />}
        </div>

        {/* Motivation text */}
        {session.status !== "completed" && contentTotal > 0 && (
          <div className={`pt-3 border-t text-xs font-medium flex items-center gap-2 ${
            motivScorePct === 100 ? "border-emerald-500/20 text-emerald-400" :
            motivScorePct >= 80  ? "border-amber-500/10 text-amber-300" :
            "border-white/5 text-gray-400"
          }`}>
            <span className="text-base">
              {motivScorePct === 0 ? "🚀" : motivScorePct < 30 ? "💪" : motivScorePct < 60 ? "🔥" : motivScorePct < 80 ? "🎯" : motivScorePct < 100 ? "⚡" : "🎉"}
            </span>
            <span>
              {motivScorePct === 0   && "Every journey starts with the first step. Let's go!"}
              {motivScorePct > 0 && motivScorePct < 30  && "Great start! Keep pushing — you're just warming up."}
              {motivScorePct >= 30 && motivScorePct < 60 && "You're building momentum! Don't stop now."}
              {motivScorePct >= 60 && motivScorePct < 80 && "More than halfway to a perfect score! Push through."}
              {motivScorePct >= 80 && motivScorePct < 100 && "So close to perfection! Just a few more to master."}
              {motivScorePct === 100 && completing && "Perfect! Completing your session…"}
            </span>
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
            🧠 Quiz {quizPct !== null ? `(${quizCorrectN}/${questions.length} ✓)` : ""}
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
            <div className="text-center py-3 space-y-1">
              <p className="text-emerald-400 font-bold text-sm">✓ All cards mastered!</p>
              {questions.length > 0
                ? <p className="text-xs text-gray-400">Now conquer the quiz to reach 100% 🧠</p>
                : <p className="text-xs text-gray-400">Completing your session…</p>}
            </div>
          )}
        </div>
      )}

      {/* ── Quiz panel ── */}
      {phase === "quiz" && questions.length > 0 && (
        <div className="flex flex-col gap-4">
          {quizQueue.length > 0 && question ? (
            <>
              {/* Progress header */}
              <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                <span className="text-emerald-400 font-semibold">{correctIds.size} correct</span>
                <span className="font-semibold text-white">{correctIds.size + 1} / {questions.length}</span>
                <span>{quizQueue.length} remaining</span>
              </div>

              {/* Question card */}
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-4">
                <p className="text-sm font-semibold text-white leading-relaxed">{question.question_text}</p>

                <div className="flex flex-col gap-2">
                  {question.options.map(opt => {
                    const isSelected = currentSelected === opt.id;
                    const isCorrect  = opt.is_correct;
                    let cls = "flex items-start gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all cursor-pointer ";
                    if (currentRevealed) {
                      if (isCorrect)       cls += "bg-emerald-500/10 border-emerald-500/30 text-emerald-300";
                      else if (isSelected) cls += "bg-red-500/10 border-red-500/30 text-red-300";
                      else                 cls += "bg-white/[0.02] border-white/5 text-gray-500";
                    } else if (isSelected) {
                      cls += "bg-violet-500/15 border-violet-500/40 text-white";
                    } else {
                      cls += "bg-white/[0.03] border-white/5 text-gray-300 hover:border-white/15 hover:text-white";
                    }
                    return (
                      <button key={opt.id} onClick={() => !currentRevealed && setCurrentSelected(opt.id)}
                        className={cls} disabled={currentRevealed}>
                        <span className="flex-shrink-0 w-5 h-5 rounded-full border border-current flex items-center justify-center text-xs mt-0.5">
                          {currentRevealed ? (isCorrect ? "✓" : isSelected ? "✗" : "") : (isSelected ? "●" : "")}
                        </span>
                        <span>{opt.option_text}</span>
                      </button>
                    );
                  })}
                </div>

                {!currentRevealed ? (
                  <button
                    onClick={revealAnswer}
                    disabled={!currentSelected}
                    className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold disabled:opacity-40 transition-colors"
                  >
                    Check Answer
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className={`text-xs font-semibold ${isCurrentCorrect ? "text-emerald-400" : "text-red-400"}`}>
                      {isCurrentCorrect ? "✓ Correct!" : "✗ Wrong — you'll see this again"}
                    </p>
                    {question.explanation && (
                      <p className="text-xs text-gray-400 bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2">
                        💡 {question.explanation}
                      </p>
                    )}
                    <button onClick={advanceQueue}
                      className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors border ${
                        isCurrentCorrect
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                          : "bg-red-500/10 border-red-500/20 text-red-300 hover:bg-red-500/20"
                      }`}>
                      {isCurrentCorrect ? "Continue →" : "↺ Try again"}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* All questions answered correctly */
            <div className="text-center py-3 space-y-1 rounded-xl px-4 bg-emerald-500/10 border border-emerald-500/20">
              <p className="font-bold text-sm text-emerald-400">🎉 Perfect quiz score!</p>
              <p className="text-xs text-gray-500">{questions.length} / {questions.length} correct</p>
            </div>
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
        <div className="space-y-3">
          {/* Celebration card */}
          <div className="p-5 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl text-center space-y-2">
            <p className="text-3xl">🏆</p>
            <p className="text-emerald-400 font-bold text-base">Perfect Score! Session Complete</p>
            <p className="text-xs text-gray-400">You've mastered all the material. Your progress has been saved.</p>
          </div>
          {/* Next goal prompt */}
          {nextGoal ? (
            <div className="p-4 bg-violet-500/10 border border-violet-500/20 rounded-2xl space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">🎯</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">Ready for your next goal?</p>
                  <p className="text-xs text-violet-300 mt-0.5 line-clamp-2">"{nextGoal.title}"</p>
                  {nextGoal.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{nextGoal.description}</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-400">
                You're on a roll! Start the next goal while the momentum is high. Consistent daily progress beats cramming every time.
              </p>
              <button
                onClick={onBack}
                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors"
              >
                Continue to Next Goal →
              </button>
            </div>
          ) : goals.length > 0 ? (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-center space-y-2">
              <p className="text-2xl">🌟</p>
              <p className="text-amber-400 font-bold text-sm">All goals complete!</p>
              <p className="text-xs text-gray-400">You've mastered every goal in this workspace. Incredible work!</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ── Sessions Tab ──────────────────────────────────────────────────────────────

type SavedSessionProgress = {
  knownCards: Set<string>;
  correctIds: Set<string>;
  cardIndex: number;
};

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
  // Persists progress across pause/resume without causing re-renders
  const progressRef = useRef<Map<string, SavedSessionProgress>>(new Map());
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
  const [selectedGoals, setSelectedGoals]     = useState<Set<string>>(new Set());
  const [builderSummary, setBuilderSummary]   = useState("");
  const [builderMode, setBuilderMode]         = useState<"auto" | "manual">("auto");
  const [fcDiff, setFcDiff]                   = useState<Difficulty>("normal");
  const [fcCount, setFcCount]                 = useState(10);
  const [qzDiff, setQzDiff]                   = useState<Difficulty>("normal");
  const [qzCount, setQzCount]                 = useState(5);
  const [sessionDuration, setSessionDuration] = useState(60);
  const [building, setBuilding]               = useState(false);
  const [buildError, setBuildError]           = useState("");
  const [buildResult, setBuildResult]         = useState<GenerateStudySessionResponse | null>(null);

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
      setSelectedGoals(new Set([initialGoal.id]));
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
    if (sourceMode === "goal" && selectedGoals.size === 0) {
      setBuildError("Select at least one goal from the list above."); return;
    }
    setBuilding(true); setBuildError(""); setBuildResult(null);
    try {
      const selectedGoalList = roadmapGoals.filter(g => selectedGoals.has(g.id));
      const goalContext = sourceMode === "goal" && selectedGoalList.length > 0
        ? selectedGoalList.map(g => [g.title, g.description].filter(Boolean).join("\n")).join("\n\n")
        : undefined;
      const res = await aiGenerateStudySession(workspaceId, {
        summary: sourceMode === "summary" ? (builderSummary.trim() || undefined) : undefined,
        goal_context: goalContext,
        goal_ids: sourceMode === "goal" && selectedGoals.size > 0 ? [...selectedGoals] : undefined,
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
        savedProgress={progressRef.current.get(activeSession.id)}
        onSaveProgress={(p) => progressRef.current.set(activeSession.id, p)}
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
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Select Roadmap Goals</p>
                  {selectedGoals.size > 0 && (
                    <button onClick={() => { setSelectedGoals(new Set()); setBuildError(""); setBuildResult(null); }}
                      className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                      Clear ({selectedGoals.size})
                    </button>
                  )}
                </div>
                {goalsLoading ? (
                  <p className="text-xs text-gray-500 py-2">Loading goals…</p>
                ) : roadmapGoals.length === 0 ? (
                  <p className="text-xs text-gray-600 bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3">
                    No roadmap goals yet. Generate a roadmap in the Road Map tab first.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-0.5">
                    {roadmapGoals.map(goal => {
                      const isSelected = selectedGoals.has(goal.id);
                      return (
                        <button
                          key={goal.id}
                          onClick={() => {
                            setSelectedGoals(prev => {
                              const next = new Set(prev);
                              isSelected ? next.delete(goal.id) : next.add(goal.id);
                              return next;
                            });
                            setBuildError(""); setBuildResult(null);
                          }}
                          className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                            isSelected
                              ? "bg-violet-500/15 border-violet-500/40 text-white"
                              : "bg-white/[0.03] border-white/5 text-gray-300 hover:border-white/15 hover:text-white"
                          }`}
                        >
                          <span className={`mt-0.5 text-sm flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center ${isSelected ? "bg-violet-500 border-violet-500 text-white" : "border-white/20"}`}>
                            {isSelected ? "✓" : ""}
                          </span>
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
                {selectedGoals.size > 0 && (
                  <p className="text-xs text-gray-600 pl-1">
                    {selectedGoals.size} goal{selectedGoals.size > 1 ? "s" : ""} selected — all will be linked to this session.
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
                    {s.flashcard_reviews_count > 0 && (
                      <span className="ml-2 text-violet-400">{s.flashcard_reviews_count} reviews</span>
                    )}
                    {s.quiz_score_pct !== null && (
                      <span className={`ml-2 font-semibold ${s.quiz_score_pct >= 70 ? "text-emerald-400" : s.quiz_score_pct >= 40 ? "text-amber-400" : "text-red-400"}`}>
                        {Math.round(s.quiz_score_pct)}%
                      </span>
                    )}
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
      {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}

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

// ── Flashcard Study Modal ──────────────────────────────────────────────────────

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
          <div className="flex items-center justify-center h-full text-gray-600 text-sm">Loading history...</div>
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
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask something..."
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

// Flashcard Study Modal

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
    // Save SRS review event (fire-and-forget, no session context here)
    const qualityRating = gotIt ? 4 : 1;
    const nextReviewAt = new Date(Date.now() + (gotIt ? 3 : 1) * 24 * 60 * 60 * 1000).toISOString();
    submitReview({
      flashcard_id: current.id,
      quality_rating: qualityRating,
      next_review_at: nextReviewAt,
    }).catch(() => {});
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


