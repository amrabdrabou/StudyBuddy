import { useState, useEffect } from "react";
import { getWorkspaces, type Workspace } from "../api/workspaces";
import {
  getMicroGoals, createMicroGoal, updateMicroGoal, deleteMicroGoal,
  type MicroGoal, type MicroGoalStatus,
} from "../api/micro_goals";
import { aiGenerateStudySession } from "../api/ai";
import ErrorBanner from "../components/ui/ErrorBanner";

// ── Status helpers ─────────────────────────────────────────────────────────────

const CYCLE: MicroGoalStatus[] = ["suggested", "pending", "in_progress", "completed"];

function statusBadge(s: MicroGoalStatus) {
  if (s === "completed")   return { icon: "✅", cls: "text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20" };
  if (s === "in_progress") return { icon: "🔄", cls: "text-blue-400 bg-blue-400/10 hover:bg-blue-400/20" };
  if (s === "pending")     return { icon: "⏳", cls: "text-amber-400 bg-amber-400/10 hover:bg-amber-400/20" };
  if (s === "skipped")     return { icon: "⏭️", cls: "text-gray-500 bg-gray-500/10 hover:bg-gray-500/20" };
  return { icon: "💡", cls: "text-violet-400 bg-violet-400/10 hover:bg-violet-400/20" };
}

// ── Content for the selected workspace ────────────────────────────────────────

function WorkspaceRoadmap({ workspace }: { workspace: Workspace }) {
  const [goals, setGoals]           = useState<MicroGoal[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");

  // Session builder state
  const [summary, setSummary]       = useState("");
  const [mode, setMode]             = useState<"auto" | "manual">("auto");
  const [fcDifficulty, setFcDiff]   = useState<"easy" | "normal" | "hard">("normal");
  const [fcCount, setFcCount]       = useState(10);
  const [qzDifficulty, setQzDiff]   = useState<"easy" | "normal" | "hard">("normal");
  const [qzCount, setQzCount]       = useState(5);
  const [duration, setDuration]     = useState(60);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError]     = useState("");
  const [result, setResult]         = useState<import("../api/ai").GenerateStudySessionResponse | null>(null);

  // Manual add
  const [newTitle, setNewTitle]     = useState("");
  const [adding, setAdding]         = useState(false);

  useEffect(() => { loadGoals(); }, [workspace.id]);

  async function loadGoals() {
    setLoading(true); setError("");
    try {
      const data = await getMicroGoals(workspace.id);
      setGoals([...data].sort((a, b) => a.order_index - b.order_index));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load goals");
    } finally { setLoading(false); }
  }

  async function handleGenerate() {
    if (summary.trim().length < 50) { setGenError("Please paste at least 50 characters of summary text."); return; }
    setGenerating(true); setGenError(""); setResult(null);
    try {
      const res = await aiGenerateStudySession(workspace.id, {
        summary: summary.trim(),
        mode,
        ...(mode === "manual" ? {
          flashcard_difficulty: fcDifficulty,
          flashcard_count: fcCount,
          quiz_difficulty: qzDifficulty,
          quiz_count: qzCount,
          session_duration_minutes: duration,
        } : {}),
      });
      setResult(res);
      setSummary("");
      await loadGoals();
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Generation failed.");
    } finally { setGenerating(false); }
  }

  async function handleStatusToggle(goal: MicroGoal) {
    const next = CYCLE[(CYCLE.indexOf(goal.status as MicroGoalStatus) + 1) % CYCLE.length];
    try { await updateMicroGoal(workspace.id, goal.id, { status: next }); await loadGoals(); }
    catch { /* silent */ }
  }

  async function handleDelete(goalId: string) {
    try { await deleteMicroGoal(workspace.id, goalId); await loadGoals(); }
    catch { /* silent */ }
  }

  async function handleAddGoal() {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      await createMicroGoal(workspace.id, { title: newTitle.trim(), order_index: goals.length });
      setNewTitle(""); await loadGoals();
    } catch { /* silent */ }
    finally { setAdding(false); }
  }

  const diffCls = (active: boolean) =>
    active
      ? "px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30"
      : "px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 text-gray-400 border border-white/10 hover:text-white transition-colors";

  return (
    <div className="flex flex-col gap-6">
      {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>}

      {/* ── Study session builder ── */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Generate Study Session</h3>
          <p className="text-xs text-gray-500 mt-0.5">Paste your summary and let AI build a complete study plan — flashcards, quiz, and goals.</p>
        </div>

        {/* Summary */}
        <textarea
          value={summary}
          onChange={e => { setSummary(e.target.value); setGenError(""); setResult(null); }}
          placeholder="Paste your document summary here…"
          rows={4}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.07] resize-none transition-colors"
        />

        {/* Mode toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setMode("auto")}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${mode === "auto"
              ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
              : "bg-white/5 text-gray-400 border border-white/10 hover:text-white"}`}
          >
            ✨ Full Auto
          </button>
          <button
            onClick={() => setMode("manual")}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${mode === "manual"
              ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
              : "bg-white/5 text-gray-400 border border-white/10 hover:text-white"}`}
          >
            ⚙️ Custom
          </button>
        </div>

        {mode === "auto" && (
          <p className="text-xs text-gray-500 bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3">
            AI will analyse your summary and automatically choose the best flashcard count, quiz count, difficulty levels, and session duration.
          </p>
        )}

        {/* Manual config */}
        {mode === "manual" && (
          <div className="flex flex-col gap-4 bg-white/[0.03] border border-white/5 rounded-xl px-4 py-4">
            {/* Flashcards */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Flashcards</p>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex gap-1">
                  {(["easy","normal","hard"] as const).map(d => (
                    <button key={d} onClick={() => setFcDiff(d)} className={diffCls(fcDifficulty === d)}>
                      {d}
                    </button>
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

            {/* Quiz */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Quiz</p>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex gap-1">
                  {(["easy","normal","hard"] as const).map(d => (
                    <button key={d} onClick={() => setQzDiff(d)} className={diffCls(qzDifficulty === d)}>
                      {d}
                    </button>
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

            {/* Session duration */}
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Session Duration</p>
              <div className="flex items-center gap-2">
                <input type="number" min={20} max={120} step={5} value={duration}
                  onChange={e => setDuration(Math.min(120, Math.max(20, Number(e.target.value))))}
                  className="w-20 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white text-center focus:outline-none focus:border-violet-500/50" />
                <span className="text-xs text-gray-500">min</span>
              </div>
            </div>
          </div>
        )}

        {genError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{genError}</p>}

        <button
          onClick={handleGenerate}
          disabled={generating || summary.trim().length < 50}
          className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {generating
            ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Building session…</>
            : "Generate Study Session"}
        </button>

        {/* Result card */}
        {result && (
          <div className="flex flex-col gap-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 text-base">✓</span>
              <p className="text-sm font-semibold text-white">{result.session_title}</p>
              <span className="ml-auto text-xs text-emerald-400 font-semibold">{result.duration_minutes} min</span>
            </div>
            {result.focus_summary && <p className="text-xs text-gray-400">{result.focus_summary}</p>}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-white/5 rounded-lg py-2">
                <p className="text-white font-bold text-base">{result.cards_created}</p>
                <p className="text-gray-500 mt-0.5">flashcards</p>
                <p className="text-violet-400 capitalize">{result.flashcard_difficulty}</p>
              </div>
              <div className="bg-white/5 rounded-lg py-2">
                <p className="text-white font-bold text-base">{result.questions_created}</p>
                <p className="text-gray-500 mt-0.5">quiz Qs</p>
                <p className="text-violet-400 capitalize">{result.quiz_difficulty}</p>
              </div>
              <div className="bg-white/5 rounded-lg py-2">
                <p className="text-white font-bold text-base">{result.goals_created}</p>
                <p className="text-gray-500 mt-0.5">new goals</p>
                <p className="text-violet-400">added</p>
              </div>
            </div>
            {result.tips.length > 0 && (
              <div className="flex flex-col gap-1">
                {result.tips.map((tip, i) => (
                  <p key={i} className="text-xs text-gray-400 flex gap-2">
                    <span className="text-emerald-400 flex-shrink-0">•</span>{tip}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual add */}
      <div className="flex gap-2">
        <input type="text" value={newTitle} maxLength={300}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAddGoal()}
          placeholder="Add a goal manually…"
          className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors"
        />
        <button onClick={handleAddGoal} disabled={adding || !newTitle.trim()}
          className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/30 disabled:opacity-50 transition-colors text-sm">
          {adding ? "…" : "+"}
        </button>
      </div>

      {/* Goals list */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
          <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />Loading…
        </div>
      ) : goals.length === 0 ? (
        <div className="text-center py-16 text-gray-500 text-sm">
          <p className="text-4xl mb-3">🗺️</p>
          <p className="font-semibold text-gray-400">No micro-goals yet</p>
          <p className="mt-1">Generate a study session above or add goals manually.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Micro-Goals · {goals.length}</p>
          {goals.map(goal => {
            const { icon, cls } = statusBadge(goal.status as MicroGoalStatus);
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
                  {goal.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{goal.description}</p>}
                </div>
                <button onClick={() => handleDelete(goal.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-600 hover:text-red-400 transition-all flex-shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main section ───────────────────────────────────────────────────────────────

export default function RoadmapSection() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWsId, setActiveWsId] = useState("");
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    getWorkspaces()
      .then(ws => {
        setWorkspaces(ws);
        if (ws.length > 0) setActiveWsId(ws[0].id);
        setLoading(false);
      })
      .catch(e => {
        setError(e instanceof Error ? e.message : "Failed to load workspaces");
        setLoading(false);
      });
  }, []);

  const activeWs = workspaces.find(w => w.id === activeWsId);

  return (
    <div className="flex flex-col gap-8 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Roadmap</h1>
        <p className="text-sm mt-1 text-gray-500">
          {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""} · generate micro-goals and track your study roadmap
        </p>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : workspaces.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-32 text-center">
          <p className="text-white font-bold text-xl">No workspaces yet</p>
          <p className="text-gray-500 text-sm">Create a workspace, then generate a roadmap here.</p>
        </div>
      ) : (
        <>
          {/* Scrollable workspace tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {workspaces.map(ws => (
              <button
                key={ws.id}
                onClick={() => setActiveWsId(ws.id)}
                className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                style={activeWsId === ws.id
                  ? { background: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.3)" }
                  : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.08)" }
                }
              >
                {ws.title}
              </button>
            ))}
          </div>

          {/* Content for active workspace */}
          {activeWs && <WorkspaceRoadmap key={activeWs.id} workspace={activeWs} />}
        </>
      )}
    </div>
  );
}
