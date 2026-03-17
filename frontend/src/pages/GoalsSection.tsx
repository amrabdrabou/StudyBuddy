import { useState, useEffect } from "react";
import {
  getBigGoals, createBigGoal, updateBigGoal, deleteBigGoal,
  type BigGoal, type BigGoalStatus,
} from "../api/big_goals";
import { getSubjects, type Subject } from "../api/subjects";
import Modal from "../components/ui/Modal";
import GoalCard from "../components/goals/GoalCard";

const FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: "All",       value: "all" },
  { label: "Active",    value: "active" },
  { label: "Paused",    value: "paused" },
  { label: "Completed", value: "completed" },
  { label: "Overdue",   value: "overdue" },
];

export default function GoalsSection() {
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
  const [saving, setSaving]         = useState(false);

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
      await createBigGoal({
        title: title.trim(),
        description: description.trim() || undefined,
        deadline: deadline || undefined,
        subject_ids: selectedSubjectIds,
      });
      setTitle(""); setDescription(""); setDeadline(""); setSelectedSubjectIds([]);
      setShowCreate(false);
      await load();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  };

  const handleEdit = async (goal: BigGoal) => {
    // GoalCard calls onEdit with { ...goal, status: newStatus } for status transitions
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
            <GoalCard key={g.id} goal={g} subjects={subjects} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

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
    </div>
  );
}
