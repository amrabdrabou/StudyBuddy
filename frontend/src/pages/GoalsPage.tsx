import { useState, useEffect } from "react";
import {
  getBigGoals, createBigGoal, updateBigGoal, deleteBigGoal,
  type BigGoal, type BigGoalStatus,
} from "../api/big_goals";
import { getSubjects, type Subject } from "../api/subjects";
import Modal from "../components/ui/Modal";

// Nav actions interface
interface NavActions {
  toGoal: (g: BigGoal) => void;
}

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

const FILTER_OPTIONS = ["all","active","paused","completed","overdue"] as const;
const PRESET_COLORS = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#06b6d4"];
const PRESET_ICONS  = ["🎯","📚","🔬","📐","🧠","💡","🚀","🏆","✍️","📝","💻","🎓"];

export default function GoalsPage({ nav }: { nav: NavActions }) {
  const [goals, setGoals]       = useState<BigGoal[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<string>("all");
  const [error, setError]       = useState("");

  // Create modal state
  const [showCreate, setShowCreate]         = useState(false);
  const [title, setTitle]                   = useState("");
  const [description, setDescription]       = useState("");
  const [deadline, setDeadline]             = useState("");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [coverColor, setCoverColor]         = useState("#6366f1");
  const [icon, setIcon]                     = useState("🎯");
  const [saving, setSaving]                 = useState(false);

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
      nav.toGoal(g);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (goal: BigGoal, status: BigGoalStatus) => {
    try { await updateBigGoal(goal.id, { status }); await load(); }
    catch { setError("Failed to update"); }
  };

  const handleDelete = async (goal: BigGoal) => {
    if (!confirm(`Delete "${goal.title}"?`)) return;
    try { await deleteBigGoal(goal.id); await load(); }
    catch { setError("Failed to delete"); }
  };

  const filtered = filter === "all" ? goals : goals.filter(g => g.status === filter);
  const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s]));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Missions</h1>
          <p className="text-sm text-gray-500 mt-1">Your big goals — each one drives a learning journey</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all active:scale-95"
          style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)", boxShadow: "0 4px 20px rgba(99,102,241,0.3)" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/>
          </svg>
          New Mission
        </button>
      </div>

      {error && <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-sm border border-red-500/20">{error}</div>}

      {/* Filter strip */}
      <div className="flex gap-1 p-1 bg-white/[0.04] border border-white/[0.06] rounded-xl w-fit">
        {FILTER_OPTIONS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all ${
              filter === f ? "bg-white/[0.12] text-white" : "text-gray-500 hover:text-white"
            }`}>
            {f}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1,2,3,4].map(i => <div key={i} className="h-48 rounded-2xl bg-white/[0.04] animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-5 py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-3xl">🎯</div>
          <div>
            <p className="text-white font-bold">No missions yet</p>
            <p className="text-gray-500 text-sm mt-1">Create your first mission to start your learning journey</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors">
            Create Mission
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(g => {
            const color = g.cover_color ?? "#6366f1";
            const goalSubjects = g.subject_ids.map(id => subjectMap[id]).filter(Boolean);
            return (
              <div
                key={g.id}
                onClick={() => nav.toGoal(g)}
                className="relative overflow-hidden rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl group"
                style={{ background: `${color}0a`, borderColor: `${color}25` }}
              >
                {/* Accent bar */}
                <div className="h-1" style={{ background: color }} />

                <div className="p-5 space-y-4">
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <span className="text-2xl flex-shrink-0">{g.icon ?? "🎯"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-base leading-tight truncate">{g.title}</p>
                        {g.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{g.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {g.pinned && <span className="text-amber-400 text-xs">📌</span>}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${statusBadge(g.status)}`}>
                        {g.status.replace(/_/g," ")}
                      </span>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Progress</span>
                      <span className="font-semibold" style={{ color }}>{g.progress_pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${g.progress_pct}%`, background: color }} />
                    </div>
                  </div>

                  {/* Subjects chips */}
                  {goalSubjects.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {goalSubjects.slice(0,3).map(s => (
                        <span key={s.id} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: `${color}15`, color }}>
                          {s.name}
                        </span>
                      ))}
                      {goalSubjects.length > 3 && (
                        <span className="text-[10px] text-gray-500">+{goalSubjects.length - 3} more</span>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex gap-3 text-[10px] text-gray-500">
                      <span>{g.subject_ids.length} subject{g.subject_ids.length !== 1 ? "s" : ""}</span>
                      {g.deadline && (
                        <span>Due {new Date(g.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                      )}
                    </div>
                    {/* Quick actions – only visible on hover */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={e => e.stopPropagation()}>
                      {g.status === "active" && (
                        <button onClick={() => handleStatusChange(g, "paused")}
                          className="text-[10px] px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors">
                          Pause
                        </button>
                      )}
                      {g.status === "paused" && (
                        <button onClick={() => handleStatusChange(g, "active")}
                          className="text-[10px] px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                          Resume
                        </button>
                      )}
                      <button onClick={() => handleDelete(g)}
                        className="text-[10px] px-2 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
                      style={{ background: c, borderColor: coverColor === c ? "white" : "transparent", transform: coverColor === c ? "scale(1.3)" : "scale(1)" }}/>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Icon</label>
                <div className="flex flex-wrap gap-1">
                  {PRESET_ICONS.map(em => (
                    <button type="button" key={em} onClick={() => setIcon(em)}
                      className={`w-7 h-7 rounded-lg text-sm transition-all ${icon === em ? "bg-white/20 scale-110" : "bg-white/5 hover:bg-white/10"}`}>
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
    </div>
  );
}
