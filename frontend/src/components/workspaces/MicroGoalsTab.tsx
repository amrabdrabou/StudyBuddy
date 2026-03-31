import { useEffect, useState } from "react";

import { aiGenerateRoadmap, type Difficulty } from "../../api/ai";
import { getDocuments, type Document } from "../../api/documents";
import {
  createMicroGoal,
  deleteMicroGoal,
  getMicroGoals,
  updateMicroGoal,
  type MicroGoal,
  type MicroGoalStatus,
} from "../../api/micro_goals";
import CollapsibleCard from "../ui/CollapsibleCard";

export default function MicroGoalsTab({
  workspaceId,
  onStartSession,
}: {
  workspaceId: string;
  onStartSession: (goal: MicroGoal) => void;
}) {
  const [goals, setGoals]               = useState<MicroGoal[]>([]);
  const [docs, setDocs]                 = useState<Document[]>([]);
  const [loading, setLoading]           = useState(true);
  const [sourceMode, setSourceMode]     = useState<"documents" | "summary">("documents");
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [summaryText, setSummaryText]   = useState("");
  const [configMode, setConfigMode]     = useState<"auto" | "custom">("auto");
  const [difficulty, setDifficulty]     = useState<Difficulty>("normal");
  const [goalCount, setGoalCount]       = useState(8);
  const [generating, setGen]            = useState(false);
  const [genError, setGenError]         = useState("");
  const [genSuccess, setGenSuccess]     = useState<number | null>(null);
  const [newTitle, setNewTitle]         = useState("");
  const [adding, setAdding]             = useState(false);

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
        setDocs(d.filter(doc => doc.status === "ready"));
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
    if (sourceMode === "summary" && summaryText.trim().length < 50) {
      setGenError("Please paste a summary of at least 50 characters."); return;
    }
    setGen(true); setGenError(""); setGenSuccess(null);
    try {
      const res = await aiGenerateRoadmap(workspaceId, {
        ...(sourceMode === "documents"
          ? { document_ids: selectedDocs.size > 0 ? [...selectedDocs] : undefined }
          : { summary_text: summaryText.trim() }),
        ...(configMode === "custom" ? { difficulty, count: goalCount } : {}),
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
      <CollapsibleCard
        title="Generate AI Roadmap"
        subtitle="Build a personalised learning path from your document summaries"
        onToggle={() => { setGenError(""); setGenSuccess(null); }}
      >
        {/* Source toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => { setSourceMode("documents"); setGenError(""); }}
            className={`flex-1 flex flex-col items-center gap-1 py-3 px-3 rounded-xl text-sm font-semibold border transition-all ${
              sourceMode === "documents"
                ? "bg-violet-600/20 text-violet-300 border-violet-500/40"
                : "bg-white/5 text-gray-400 border-white/10 hover:text-white hover:border-white/20"
            }`}
          >
            <span className="text-lg">📄</span>
            <span>From Documents</span>
            <span className="text-xs font-normal opacity-70">select one or more</span>
          </button>
          <button
            onClick={() => { setSourceMode("summary"); setGenError(""); }}
            className={`flex-1 flex flex-col items-center gap-1 py-3 px-3 rounded-xl text-sm font-semibold border transition-all ${
              sourceMode === "summary"
                ? "bg-violet-600/20 text-violet-300 border-violet-500/40"
                : "bg-white/5 text-gray-400 border-white/10 hover:text-white hover:border-white/20"
            }`}
          >
            <span className="text-lg">📝</span>
            <span>From Summary</span>
            <span className="text-xs font-normal opacity-70">paste text</span>
          </button>
        </div>

        {/* Source content */}
        {sourceMode === "documents" ? (
          docs.length === 0 ? (
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
                  <button onClick={() => setSelectedDocs(new Set())} className="text-xs text-gray-500 hover:text-white transition-colors">
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                {docs.map(doc => (
                  <label key={doc.id} className="flex items-center gap-3 px-3 py-2.5 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 cursor-pointer transition-colors">
                    <input type="checkbox" checked={selectedDocs.has(doc.id)} onChange={() => toggleDoc(doc.id)}
                      className="w-4 h-4 rounded accent-violet-500 flex-shrink-0" />
                    <span className="text-sm text-white truncate">{doc.original_filename}</span>
                  </label>
                ))}
              </div>
              {selectedDocs.size === 0 && (
                <p className="text-xs text-gray-600 pl-1">No selection = use all documents above</p>
              )}
            </div>
          )
        ) : (
          <div>
            <textarea
              value={summaryText}
              onChange={e => { setSummaryText(e.target.value); setGenError(""); }}
              placeholder="Paste AI-generated summaries or your own study notes here…"
              rows={6}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.07] resize-none transition-colors"
            />
            <p className="text-xs text-gray-600 mt-1 pl-1">Min. 50 characters</p>
          </div>
        )}

        {/* Config mode */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Configuration</p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfigMode("auto")}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${
                configMode === "auto"
                  ? "bg-violet-600/20 text-violet-300 border-violet-500/40"
                  : "bg-white/5 text-gray-400 border-white/10 hover:text-white hover:border-white/20"
              }`}
            >
              ⚡ Full Auto
            </button>
            <button
              onClick={() => setConfigMode("custom")}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${
                configMode === "custom"
                  ? "bg-violet-600/20 text-violet-300 border-violet-500/40"
                  : "bg-white/5 text-gray-400 border-white/10 hover:text-white hover:border-white/20"
              }`}
            >
              🎛️ Custom
            </button>
          </div>
        </div>

        {configMode === "custom" && (
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Difficulty</label>
              <div className="mt-1.5 flex gap-2">
                {(["easy", "normal", "hard"] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border capitalize transition-colors ${
                      difficulty === d
                        ? d === "easy"   ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : d === "normal" ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        :                  "bg-red-500/10 text-red-400 border-red-500/20"
                        : "bg-white/5 border-white/10 text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Number of goals (3–20)
              </label>
              <input
                type="number" min={3} max={20} value={goalCount}
                onChange={e => setGoalCount(Math.min(20, Math.max(3, Number(e.target.value))))}
                className="mt-1.5 w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors"
              />
            </div>
          </div>
        )}

        {genError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{genError}</p>}
        {genSuccess !== null && (
          <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg">
            ✓ Roadmap updated — {genSuccess} goal{genSuccess !== 1 ? "s" : ""} created.
          </p>
        )}

        <button
          onClick={handleGenerateRoadmap}
          disabled={generating || (sourceMode === "documents" && docs.length === 0)}
          className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
        >
          {generating
            ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Generating…</>
            : "✨ Generate Roadmap"}
        </button>
      </CollapsibleCard>

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
