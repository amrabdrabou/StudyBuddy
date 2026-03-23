import { useState, useEffect } from "react";
import {
  getBigGoals, createBigGoal, updateBigGoal, deleteBigGoal,
  type BigGoal, type BigGoalStatus,
} from "../api/big_goals";
import { getSubjects, type Subject } from "../api/subjects";
import { createWorkspace } from "../api/workspaces";
import { createNote } from "../api/notes";
import Modal from "../components/ui/Modal";
import GoalCard from "../components/goals/GoalCard";

const FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: "All",       value: "all" },
  { label: "Active",    value: "active" },
  { label: "Paused",    value: "paused" },
  { label: "Completed", value: "completed" },
  { label: "Overdue",   value: "overdue" },
];

// ── Setup Workspace Modal ──────────────────────────────────────────────────────

type SetupStep = "workspace" | "note" | "done";

function SetupWorkspaceModal({
  goal,
  subjects,
  onClose,
}: {
  goal: BigGoal;
  subjects: Subject[];
  onClose: () => void;
}) {
  const goalSubjects = subjects.filter(s => goal.subject_ids.includes(s.id));
  const pickableSubjects = goalSubjects.length > 0 ? goalSubjects : subjects;

  const [step, setStep] = useState<SetupStep>("workspace");

  // Workspace fields
  const [wsTitle, setWsTitle]       = useState(goal.title);
  const [wsSubjectId, setWsSubjectId] = useState(pickableSubjects[0]?.id ?? "");
  const [wsError, setWsError]       = useState("");
  const [wsSaving, setWsSaving]     = useState(false);
  const [createdWorkspaceId, setCreatedWorkspaceId] = useState("");
  const [createdSubjectId, setCreatedSubjectId]     = useState("");

  // Note fields
  const [noteTitle, setNoteTitle]     = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteError, setNoteError]     = useState("");
  const [noteSaving, setNoteSaving]   = useState(false);

  async function handleCreateWorkspace(e: React.FormEvent) {
    e.preventDefault();
    if (!wsSubjectId) { setWsError("Please select a subject."); return; }
    setWsSaving(true); setWsError("");
    try {
      const ws = await createWorkspace({ subject_id: wsSubjectId, title: wsTitle.trim() || goal.title });
      setCreatedWorkspaceId(ws.id);
      setCreatedSubjectId(wsSubjectId);
      setStep("note");
    } catch (e) {
      setWsError(e instanceof Error ? e.message : "Failed to create workspace.");
    } finally {
      setWsSaving(false);
    }
  }

  async function handleCreateNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteContent.trim()) { setNoteError("Note content is required."); return; }
    setNoteSaving(true); setNoteError("");
    try {
      await createNote({
        subject_id: createdSubjectId,
        workspace_id: createdWorkspaceId,
        title: noteTitle.trim() || undefined,
        content: noteContent.trim(),
      });
      setStep("done");
    } catch (e) {
      setNoteError(e instanceof Error ? e.message : "Failed to create note.");
    } finally {
      setNoteSaving(false);
    }
  }

  // ── Step: workspace ──────────────────────────────────────────────────────────
  if (step === "workspace") {
    return (
      <Modal title="Setup Workspace" onClose={onClose}>
        <form onSubmit={handleCreateWorkspace} className="space-y-4">
          <p className="text-xs text-gray-500">
            Create a workspace for <span className="text-white font-medium">"{goal.title}"</span> to organise documents, notes, and sessions.
          </p>

          {wsError && <p className="text-red-400 text-sm">{wsError}</p>}

          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Workspace title</label>
            <input
              autoFocus
              value={wsTitle}
              onChange={e => setWsTitle(e.target.value)}
              placeholder="e.g. Linear Algebra Study"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {pickableSubjects.length > 0 ? (
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Subject</label>
              <div className="flex flex-wrap gap-2">
                {pickableSubjects.map(s => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => setWsSubjectId(s.id)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      wsSubjectId === s.id
                        ? "bg-indigo-500/20 border-indigo-500 text-indigo-300"
                        : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-amber-400">
              No subjects found. Add a subject first so the workspace can be linked.
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-white/15 text-gray-400 hover:text-white font-semibold text-sm transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={wsSaving || !wsSubjectId}
              className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors disabled:opacity-50">
              {wsSaving ? "Creating…" : "Create Workspace"}
            </button>
          </div>
        </form>
      </Modal>
    );
  }

  // ── Step: note ───────────────────────────────────────────────────────────────
  if (step === "note") {
    return (
      <Modal title="Add a Note" onClose={onClose}>
        <form onSubmit={handleCreateNote} className="space-y-4">
          <p className="text-xs text-gray-500">
            Workspace created! Optionally add a note to get started.
          </p>

          {noteError && <p className="text-red-400 text-sm">{noteError}</p>}

          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Note title (optional)</label>
            <input
              autoFocus
              value={noteTitle}
              onChange={e => setNoteTitle(e.target.value)}
              placeholder="e.g. Introduction notes"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Content</label>
            <textarea
              value={noteContent}
              onChange={e => setNoteContent(e.target.value)}
              placeholder="Write your first note here…"
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setStep("done")}
              className="flex-1 py-3 rounded-xl border border-white/15 text-gray-400 hover:text-white font-semibold text-sm transition-colors">
              Skip
            </button>
            <button type="submit" disabled={noteSaving || !noteContent.trim()}
              className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors disabled:opacity-50">
              {noteSaving ? "Saving…" : "Save Note"}
            </button>
          </div>
        </form>
      </Modal>
    );
  }

  // ── Step: done ───────────────────────────────────────────────────────────────
  return (
    <Modal title="All Set!" onClose={onClose}>
      <div className="flex flex-col items-center gap-5 py-4 text-center">
        <div className="w-14 h-14 rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
          <svg className="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="text-white font-semibold text-base">Workspace is ready</p>
          <p className="text-gray-500 text-sm mt-1">
            Your workspace and notes are set up. Head to the Library to add more notes or upload documents.
          </p>
        </div>
        <button onClick={onClose}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors">
          Done
        </button>
      </div>
    </Modal>
  );
}

// ── Mission Detail Modal ───────────────────────────────────────────────────────

function MissionDetailModal({
  goal,
  subjects,
  onEdit,
  onDelete,
  onSetupWorkspace,
  onClose,
}: {
  goal: BigGoal;
  subjects: Subject[];
  onEdit: (g: BigGoal) => void;
  onDelete: (g: BigGoal) => void;
  onSetupWorkspace: (g: BigGoal) => void;
  onClose: () => void;
}) {
  const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s]));
  const goalSubjects = goal.subject_ids.map(id => subjectMap[id]).filter(Boolean);

  function statusColor(status: BigGoalStatus) {
    switch (status) {
      case "active":            return { bg: "bg-emerald-400/10", text: "text-emerald-400", bar: "bg-emerald-500" };
      case "paused":            return { bg: "bg-amber-400/10",   text: "text-amber-400",   bar: "bg-amber-500"   };
      case "completed":         return { bg: "bg-blue-400/10",    text: "text-blue-400",    bar: "bg-blue-500"    };
      case "overdue":           return { bg: "bg-red-400/10",     text: "text-red-400",     bar: "bg-red-500"     };
      case "ready_to_complete": return { bg: "bg-cyan-400/10",    text: "text-cyan-400",    bar: "bg-cyan-500"    };
      default:                  return { bg: "bg-gray-400/10",    text: "text-gray-400",    bar: "bg-gray-500"    };
    }
  }

  const sc = statusColor(goal.status);

  return (
    <Modal title="" onClose={onClose}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white leading-tight">{goal.title}</h2>
            {goal.description && (
              <p className="text-sm text-gray-400 mt-1">{goal.description}</p>
            )}
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${sc.bg} ${sc.text}`}>
            {goal.status.replace(/_/g, " ")}
          </span>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Progress</span>
            <span className="font-bold text-white">{goal.progress_pct}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${sc.bar}`}
              style={{ width: `${goal.progress_pct}%` }}
            />
          </div>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-3">
          {goal.deadline && (
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Deadline</p>
              <p className="text-sm font-semibold text-white">
                {new Date(goal.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
          )}
          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Created</p>
            <p className="text-sm font-semibold text-white">
              {new Date(goal.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Subjects */}
        {goalSubjects.length > 0 && (
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Subjects</p>
            <div className="flex flex-wrap gap-2">
              {goalSubjects.map(s => (
                <span key={s.id} className="text-xs px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300">
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 flex flex-col gap-2">
          <button
            onClick={() => { onSetupWorkspace(goal); onClose(); }}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Setup Workspace
          </button>

          <div className="flex gap-2">
            {goal.status === "active" && (
              <>
                <button
                  onClick={() => { onEdit({ ...goal, status: "completed" as BigGoalStatus }); onClose(); }}
                  className="flex-1 py-2.5 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 font-semibold text-sm transition-colors"
                >
                  Complete
                </button>
                <button
                  onClick={() => { onEdit({ ...goal, status: "paused" as BigGoalStatus }); onClose(); }}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 font-semibold text-sm transition-colors"
                >
                  Pause
                </button>
              </>
            )}
            {goal.status === "paused" && (
              <button
                onClick={() => { onEdit({ ...goal, status: "active" as BigGoalStatus }); onClose(); }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-semibold text-sm transition-colors"
              >
                Resume
              </button>
            )}
            <button
              onClick={() => { onDelete(goal); onClose(); }}
              className="flex-1 py-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 font-semibold text-sm transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── Main GoalsSection ──────────────────────────────────────────────────────────

export default function GoalsSection({ onMissionSelect }: { onMissionSelect?: (g: BigGoal) => void } = {}) {
  const [goals, setGoals]     = useState<BigGoal[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [filter, setFilter]   = useState("all");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle]           = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline]     = useState("");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [coverColor, setCoverColor] = useState("#6366f1");
  const [icon, setIcon]             = useState("🎯");
  const [saving, setSaving]         = useState(false);

  const PRESET_COLORS = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#06b6d4"];
  const PRESET_ICONS  = ["🎯","📚","🔬","📐","🧠","💡","🚀","🏆","✍️","📝","💻","🎓"];

  // Setup workspace modal
  const [setupGoal, setSetupGoal] = useState<BigGoal | null>(null);

  // Mission detail modal
  const [selectedGoal, setSelectedGoal] = useState<BigGoal | null>(null);

  const load = async () => {
    try {
      const [g, s] = await Promise.all([getBigGoals(), getSubjects()]);
      setGoals(g);
      setSubjects(s);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to load"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const newGoal = await createBigGoal({
        title: title.trim(),
        description: description.trim() || undefined,
        deadline: deadline || undefined,
        subject_ids: selectedSubjectIds,
        cover_color: coverColor,
        icon: icon,
      });
      setTitle(""); setDescription(""); setDeadline(""); setSelectedSubjectIds([]);
      setCoverColor("#6366f1"); setIcon("🎯");
      setShowCreate(false);
      await load();
      // Open setup workspace modal right after creating the mission
      setSetupGoal(newGoal);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  };

  const handleEdit = async (goal: BigGoal) => {
    try { await updateBigGoal(goal.id, { status: goal.status as BigGoalStatus }); await load(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
  };

  const handleDelete = async (goal: BigGoal) => {
    if (!confirm("Delete this goal?")) return;
    try { await deleteBigGoal(goal.id); await load(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
  };

  const toggleSubject = (id: string) => {
    setSelectedSubjectIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const filtered = filter === "all" ? goals : goals.filter(g => g.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Missions</h1>
          <p className="text-sm text-gray-400 mt-0.5">Big goals that drive your entire learning journey</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors">
          + New Mission
        </button>
      </div>

      {error && <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-sm">{error}</div>}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit flex-wrap">
        {FILTER_OPTIONS.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`text-sm py-1.5 px-4 rounded-lg font-medium transition-all ${
              filter === f.value ? "bg-violet-500 text-white" : "text-gray-400 hover:text-white"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-36 bg-white/5 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          {goals.length === 0 ? "No missions yet. Define your first one." : "No missions match this filter."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map(g => (
            <GoalCard
              key={g.id}
              goal={g}
              subjects={subjects}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onSetupWorkspace={setSetupGoal}
              onSelect={g => onMissionSelect ? onMissionSelect(g) : setSelectedGoal(g)}
            />
          ))}
        </div>
      )}

      {/* Create Mission modal */}
      {showCreate && (
        <Modal title="New Mission" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Goal title" required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500" />
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Description (optional)" rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none" />
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Deadline (optional)</label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500" />
            </div>
            {/* Color & icon picker */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Card color</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(c => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setCoverColor(c)}
                      className="w-6 h-6 rounded-full border-2 transition-all"
                      style={{
                        background: c,
                        borderColor: coverColor === c ? "white" : "transparent",
                        transform: coverColor === c ? "scale(1.25)" : "scale(1)",
                      }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Icon</label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_ICONS.map(em => (
                    <button
                      type="button"
                      key={em}
                      onClick={() => setIcon(em)}
                      className={`w-8 h-8 rounded-lg text-base transition-all ${
                        icon === em ? "bg-white/20 scale-110" : "bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {subjects.length > 0 && (
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Subjects (optional)</label>
                <div className="flex flex-wrap gap-2">
                  {subjects.map(s => (
                    <button type="button" key={s.id} onClick={() => toggleSubject(s.id)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                        selectedSubjectIds.includes(s.id)
                          ? "bg-violet-500/20 border-violet-500 text-violet-300"
                          : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                      }`}>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button type="submit" disabled={saving}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors disabled:opacity-50">
              {saving ? "Creating..." : "Create Mission"}
            </button>
          </form>
        </Modal>
      )}

      {/* Setup Workspace modal */}
      {setupGoal && (
        <SetupWorkspaceModal
          goal={setupGoal}
          subjects={subjects}
          onClose={() => setSetupGoal(null)}
        />
      )}

      {/* Mission Detail modal */}
      {selectedGoal && (
        <MissionDetailModal
          goal={selectedGoal}
          subjects={subjects}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onSetupWorkspace={g => { setSetupGoal(g); setSelectedGoal(null); }}
          onClose={() => setSelectedGoal(null)}
        />
      )}
    </div>
  );
}
