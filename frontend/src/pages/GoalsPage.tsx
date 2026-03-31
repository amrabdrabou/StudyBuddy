import { useState, useEffect } from "react";
import {
  getBigGoals, createBigGoal, updateBigGoal, deleteBigGoal,
  type BigGoal, type BigGoalStatus,
} from "../api/big_goals";
import { getSubjects, type Subject } from "../api/subjects";
import Modal from "../components/ui/Modal";
import RenameModal from "../components/ui/RenameModal";
import GoalCard from "../components/goals/GoalCard";
import FilterPillGroup from "../components/ui/FilterPillGroup";
import MainCollectionPage from "../components/ui/MainCollectionPage";
import SkeletonGrid from "../components/ui/SkeletonGrid";
import WorkspaceSetupModal from "../components/workspaces/WorkspaceSetupModal";
import { useNavStore } from "../store/navStore";

const PRESET_COLORS = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#06b6d4"];
const PRESET_ICONS  = ["🎯","📚","🔬","📐","🧠","💡","🚀","🏆","✍️","📝","💻","🎓"];

const FILTER_OPTIONS = [
  { label: "All",       value: "all" },
  { label: "Active",    value: "active" },
  { label: "Paused",    value: "paused" },
  { label: "Completed", value: "completed" },
];

export default function GoalsPage() {
  const { toGoal, toSubject } = useNavStore();
  const [goals, setGoals]       = useState<BigGoal[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("all");
  const [error, setError]       = useState("");

  // Create modal
  const [showCreate, setShowCreate]                 = useState(false);
  const [title, setTitle]                           = useState("");
  const [description, setDescription]               = useState("");
  const [deadline, setDeadline]                     = useState("");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [coverColor, setCoverColor]                 = useState("#6366f1");
  const [icon, setIcon]                             = useState("🎯");
  const [saving, setSaving]                         = useState(false);

  // Rename modal
  const [renameTarget, setRenameTarget]   = useState<BigGoal | null>(null);
  const [renameSaving, setRenameSaving]   = useState(false);
  const [renameError, setRenameError]     = useState("");

  // Setup workspace modal
  const [setupGoal, setSetupGoal] = useState<BigGoal | null>(null);

  const load = async () => {
    try {
      const [g, s] = await Promise.all([getBigGoals(), getSubjects()]);
      setGoals(g); setSubjects(s);
    } catch { setError("Failed to load missions"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const g = await createBigGoal({
        title: title.trim(),
        description: description.trim() || undefined,
        deadline: deadline || undefined,
        subject_ids: selectedSubjectIds,
        cover_color: coverColor,
        icon,
      });
      setShowCreate(false);
      setTitle(""); setDescription(""); setDeadline(""); setSelectedSubjectIds([]); setCoverColor("#6366f1"); setIcon("🎯");
      await load();
      toGoal(g);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  };

  const handleEdit = async (goal: BigGoal) => {
    try { await updateBigGoal(goal.id, { status: goal.status as BigGoalStatus }); await load(); }
    catch { setError("Failed to update"); }
  };

  const handleDelete = async (goal: BigGoal) => {
    if (!confirm(`Delete "${goal.title}"?`)) return;
    try { await deleteBigGoal(goal.id); await load(); }
    catch { setError("Failed to delete"); }
  };

  const handleRename = async (newTitle: string) => {
    if (!renameTarget) return;
    setRenameSaving(true);
    setRenameError("");
    try {
      const updated = await updateBigGoal(renameTarget.id, { title: newTitle });
      setGoals(prev => prev.map(g => g.id === updated.id ? updated : g));
      setRenameTarget(null);
    } catch (e: unknown) {
      setRenameError(e instanceof Error ? e.message : "Failed to rename mission");
    } finally { setRenameSaving(false); }
  };

  const filtered = filter === "all" ? goals : goals.filter(g => g.status === filter);

  return (
    <>
      <MainCollectionPage
        title="Missions"
        description={`${goals.length} mission${goals.length !== 1 ? "s" : ""} · your big goals driving a learning journey`}
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-105 active:scale-95 flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#4f46e5,#818cf8)", boxShadow: "0 4px 20px rgba(99,102,241,0.3)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            New Mission
          </button>
        }
        error={error}
        onDismissError={() => setError("")}
        filters={
          <FilterPillGroup
            options={FILTER_OPTIONS.map(o => ({ id: o.value, label: o.label }))}
            value={filter}
            onChange={setFilter}
            tone="indigo"
            compact
            className="w-fit"
          />
        }
        loading={loading}
        loadingFallback={<SkeletonGrid cols={4} count={8} />}
        isEmpty={filtered.length === 0}
        emptyState={{
          tone: "indigo",
          icon: (
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          ),
          title: goals.length === 0 ? "No missions yet" : "No matching missions",
          description: goals.length === 0
            ? "Create your first mission to get started."
            : "Try adjusting the filter above.",
          action: goals.length === 0 ? (
            <button onClick={() => setShowCreate(true)}
              className="px-6 py-3 rounded-2xl font-bold text-white transition-colors"
              style={{ background: "#4f46e5" }}>
              Create Mission
            </button>
          ) : undefined,
        }}
        gridClassName="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {filtered.map(g => (
          <GoalCard
            key={g.id}
            goal={g}
            subjects={subjects}
            onDelete={handleDelete}
            onSelect={toGoal}
            onSubjectSelect={toSubject}
            onRename={g => { setRenameError(""); setRenameTarget(g); }}
          />
        ))}
      </MainCollectionPage>

      {/* Create Mission Modal */}
      {showCreate && (
        <Modal title="New Mission" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)} required
              placeholder="Mission title…"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"/>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              placeholder="Description (optional)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm resize-none"/>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Deadline (optional)</label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 text-sm"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Card color</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(c => (
                    <button type="button" key={c} onClick={() => setCoverColor(c)}
                      className="w-6 h-6 rounded-full border-2 transition-all"
                      style={{ background: c, borderColor: coverColor === c ? "white" : "transparent", transform: coverColor === c ? "scale(1.25)" : "scale(1)" }}/>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Icon</label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_ICONS.map(em => (
                    <button type="button" key={em} onClick={() => setIcon(em)}
                      className={`w-8 h-8 rounded-lg text-base transition-all ${icon === em ? "bg-white/20 scale-110" : "bg-white/5 hover:bg-white/10"}`}>
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {subjects.length > 0 && (
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Link subjects (optional)</label>
                <div className="flex flex-wrap gap-2">
                  {subjects.map(s => (
                    <button type="button" key={s.id}
                      onClick={() => setSelectedSubjectIds(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id])}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                        selectedSubjectIds.includes(s.id)
                          ? "bg-indigo-500/20 border-indigo-500 text-indigo-300"
                          : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                      }`}>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowCreate(false)}
                className="flex-1 py-3 rounded-xl border border-white/15 text-gray-400 hover:text-white font-semibold text-sm transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving || !title.trim()}
                className="flex-1 py-3 rounded-xl text-white font-bold text-sm transition-colors disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
                {saving ? "Creating…" : "Create Mission"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {renameTarget && (
        <RenameModal
          title="Rename Mission"
          label="Mission title"
          initialValue={renameTarget.title}
          placeholder="Mission title"
          confirmLabel="Save Mission"
          saving={renameSaving}
          error={renameError}
          onClose={() => { setRenameTarget(null); setRenameError(""); }}
          onSubmit={handleRename}
        />
      )}

      {setupGoal && (
        <WorkspaceSetupModal
          titleSeed={setupGoal.title}
          subjects={subjects}
          allowedSubjectIds={setupGoal.subject_ids}
          intro={
            <>Create a workspace for <span className="text-white font-medium">"{setupGoal.title}"</span> to organise documents, notes, and sessions.</>
          }
          onClose={() => setSetupGoal(null)}
        />
      )}
    </>
  );
}
