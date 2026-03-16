import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import {
  getGoals, createGoal, updateGoal, deleteGoal,
  type LearningGoal, type GoalType, type GoalStatus,
} from "../api/goals";
import type { Subject } from "../api/subjects";

export interface GoalsSectionHandle {
  openCreate: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const goalTypeLabels: Record<GoalType, string> = {
  finish_course:  "Finish Course",
  exam_prep:      "Exam Prep",
  hours_target:   "Hours Target",
  topic_mastery:  "Topic Mastery",
  custom:         "Custom",
};

const statusStyles: Record<GoalStatus, { bg: string; text: string; label: string }> = {
  active:    { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "Active"    },
  paused:    { bg: "bg-amber-500/15",   text: "text-amber-400",   label: "Paused"    },
  completed: { bg: "bg-indigo-500/15",  text: "text-indigo-400",  label: "Completed" },
  abandoned: { bg: "bg-red-500/15",     text: "text-red-400",     label: "Abandoned" },
};

// ── Shared inputs ─────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-400">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl bg-white/[0.08] border border-white/15 px-4 py-3 text-white " +
  "placeholder:text-gray-600 outline-none text-sm " +
  "focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition [&>option]:bg-slate-800";

// ── Modal ─────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
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

// ── Goal Card ─────────────────────────────────────────────────────────────────

function GoalCard({
  goal, onEdit, onDelete, onStatusChange,
}: {
  goal: LearningGoal;
  onEdit: (g: LearningGoal) => void;
  onDelete: (g: LearningGoal) => void;
  onStatusChange: (g: LearningGoal, s: GoalStatus) => void;
}) {
  const st = statusStyles[goal.status];
  return (
    <div className="group bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 flex flex-col gap-4
                    hover:bg-white/[0.06] hover:border-violet-500/20 transition-all duration-200">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
              {st.label}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.06] text-gray-400">
              {goalTypeLabels[goal.goal_type]}
            </span>
          </div>
          <p className="text-white font-semibold leading-snug truncate">{goal.title}</p>
          {goal.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{goal.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => onEdit(goal)} title="Edit"
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button onClick={() => onDelete(goal)} title="Delete"
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-gray-500">Progress</span>
          <span className="text-violet-400 font-bold">{goal.progress_pct}%</span>
        </div>
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-500 rounded-full transition-all duration-700"
            style={{ width: `${Math.min(100, goal.progress_pct)}%` }}
          />
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-auto pt-2 border-t border-white/[0.05]">
        {goal.target_date && (
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {fmtDate(goal.target_date)}
          </span>
        )}
        {goal.target_hours && (
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {Number(goal.total_hours_logged).toFixed(1)}h / {goal.target_hours}h
          </span>
        )}
        {goal.target_score_pct && (
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Target {goal.target_score_pct}%
          </span>
        )}
      </div>

      {/* Quick status actions */}
      {goal.status === "active" && (
        <div className="flex gap-2">
          <button
            onClick={() => onStatusChange(goal, "completed")}
            className="flex-1 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold transition-colors border border-emerald-500/20">
            Mark Complete
          </button>
          <button
            onClick={() => onStatusChange(goal, "paused")}
            className="flex-1 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold transition-colors border border-amber-500/20">
            Pause
          </button>
        </div>
      )}
      {goal.status === "paused" && (
        <button
          onClick={() => onStatusChange(goal, "active")}
          className="w-full py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-bold transition-colors border border-indigo-500/20">
          Resume Goal
        </button>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

type FilterTab = "all" | GoalStatus;

interface Props { subjects: Subject[] }

const GoalsSection = forwardRef<GoalsSectionHandle, Props>(function GoalsSection({ subjects }, ref) {
  const [goals, setGoals] = useState<LearningGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");

  // Create
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", goal_type: "custom" as GoalType, target_date: "", target_hours: "", target_score_pct: "", study_subject_id: "" });
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // Edit
  const [editGoal, setEditGoal] = useState<LearningGoal | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", target_date: "", target_hours: "", target_score_pct: "", progress_pct: 0 });
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState<string | null>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<LearningGoal | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { load(); }, []);
  useEffect(() => { if (showCreate) setTimeout(() => titleRef.current?.focus(), 50); }, [showCreate]);

  useImperativeHandle(ref, () => ({ openCreate: () => { setShowCreate(true); } }));

  async function load() {
    setLoading(true);
    try { setGoals(await getGoals()); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to load goals"); }
    finally { setLoading(false); }
  }

  function openEdit(g: LearningGoal) {
    setEditGoal(g);
    setEditForm({
      title: g.title,
      description: g.description ?? "",
      target_date: g.target_date ? g.target_date.slice(0, 10) : "",
      target_hours: g.target_hours ? String(g.target_hours) : "",
      target_score_pct: g.target_score_pct ? String(g.target_score_pct) : "",
      progress_pct: g.progress_pct,
    });
    setEditErr(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true); setFormErr(null);
    try {
      const g = await createGoal({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        goal_type: form.goal_type,
        study_subject_id: form.study_subject_id || null,
        target_date: form.target_date || null,
        target_hours: form.target_hours ? Number(form.target_hours) : null,
        target_score_pct: form.target_score_pct ? Number(form.target_score_pct) : null,
      });
      setGoals(prev => [g, ...prev]);
      setShowCreate(false);
      setForm({ title: "", description: "", goal_type: "custom", target_date: "", target_hours: "", target_score_pct: "", study_subject_id: "" });
    } catch (e) { setFormErr(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editGoal || !editForm.title.trim()) return;
    setEditSaving(true); setEditErr(null);
    try {
      const g = await updateGoal(editGoal.id, {
        title: editForm.title.trim(),
        description: editForm.description.trim() || null,
        target_date: editForm.target_date || null,
        target_hours: editForm.target_hours ? Number(editForm.target_hours) : null,
        target_score_pct: editForm.target_score_pct ? Number(editForm.target_score_pct) : null,
        progress_pct: editForm.progress_pct,
      });
      setGoals(prev => prev.map(x => x.id === g.id ? g : x));
      setEditGoal(null);
    } catch (e) { setEditErr(e instanceof Error ? e.message : "Failed"); }
    finally { setEditSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteGoal(deleteTarget.id);
      setGoals(prev => prev.filter(g => g.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to delete"); setDeleteTarget(null); }
    finally { setDeleting(false); }
  }

  async function handleStatusChange(goal: LearningGoal, status: GoalStatus) {
    try {
      const g = await updateGoal(goal.id, { status });
      setGoals(prev => prev.map(x => x.id === g.id ? g : x));
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
  }

  const filtered = filter === "all" ? goals : goals.filter(g => g.status === filter);
  const counts: Record<FilterTab, number> = {
    all: goals.length,
    active: goals.filter(g => g.status === "active").length,
    paused: goals.filter(g => g.status === "paused").length,
    completed: goals.filter(g => g.status === "completed").length,
    abandoned: goals.filter(g => g.status === "abandoned").length,
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Learning Goals</h1>
          <p className="text-gray-500 text-sm mt-1">{goals.length} goal{goals.length !== 1 ? "s" : ""} total</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          New Goal
        </button>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-500/10 border border-red-400/20 px-5 py-4 text-sm text-red-300 flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200 ml-4">✕</button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "active", "paused", "completed", "abandoned"] as FilterTab[]).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors capitalize
              ${filter === f ? "bg-violet-500/20 text-violet-300 border border-violet-400/30" : "text-gray-500 hover:text-white hover:bg-white/[0.05] border border-transparent"}`}>
            {f} <span className="ml-1 text-xs opacity-70">({counts[f]})</span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 h-48 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-6 py-32 text-center">
          <div className="w-20 h-20 rounded-2xl bg-violet-500/10 border border-violet-400/15 flex items-center justify-center">
            <svg className="w-10 h-10 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-xl">{filter === "all" ? "No goals yet" : `No ${filter} goals`}</p>
            <p className="text-gray-500 text-sm mt-1">Define what you want to achieve to stay on track</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-2xl font-bold transition-colors">
            Create Your First Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(g => (
            <GoalCard key={g.id} goal={g} onEdit={openEdit} onDelete={setDeleteTarget} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <Modal title="New Learning Goal" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            {formErr && <p className="text-red-400 text-sm">{formErr}</p>}
            <Field label="Title *">
              <input ref={titleRef} className={inputCls} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Become a Senior Developer" required />
            </Field>
            <Field label="Description">
              <textarea className={inputCls + " resize-none"} rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What does success look like?" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Goal Type">
                <select className={inputCls} value={form.goal_type} onChange={e => setForm(p => ({ ...p, goal_type: e.target.value as GoalType }))}>
                  {(Object.keys(goalTypeLabels) as GoalType[]).map(t => (
                    <option key={t} value={t}>{goalTypeLabels[t]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Subject">
                <select className={inputCls} value={form.study_subject_id} onChange={e => setForm(p => ({ ...p, study_subject_id: e.target.value }))}>
                  <option value="">— None —</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Target Date">
                <input type="date" className={inputCls} value={form.target_date} onChange={e => setForm(p => ({ ...p, target_date: e.target.value }))} />
              </Field>
              <Field label="Target Hours">
                <input type="number" min="1" className={inputCls} value={form.target_hours} onChange={e => setForm(p => ({ ...p, target_hours: e.target.value }))} placeholder="—" />
              </Field>
              <Field label="Target Score %">
                <input type="number" min="1" max="100" className={inputCls} value={form.target_score_pct} onChange={e => setForm(p => ({ ...p, target_score_pct: e.target.value }))} placeholder="—" />
              </Field>
            </div>
            <div className="flex gap-3 mt-2">
              <button type="button" onClick={() => setShowCreate(false)}
                className="flex-1 py-3 rounded-xl border border-white/15 text-gray-400 hover:text-white hover:border-white/30 font-semibold text-sm transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition-colors disabled:opacity-50">
                {saving ? "Creating…" : "Create Goal"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit modal */}
      {editGoal && (
        <Modal title="Edit Goal" onClose={() => setEditGoal(null)}>
          <form onSubmit={handleEdit} className="flex flex-col gap-4">
            {editErr && <p className="text-red-400 text-sm">{editErr}</p>}
            <Field label="Title *">
              <input className={inputCls} value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} required />
            </Field>
            <Field label="Description">
              <textarea className={inputCls + " resize-none"} rows={2} value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} />
            </Field>
            <Field label={`Progress: ${editForm.progress_pct}%`}>
              <input type="range" min="0" max="100" value={editForm.progress_pct}
                onChange={e => setEditForm(p => ({ ...p, progress_pct: Number(e.target.value) }))}
                className="w-full accent-violet-500" />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Target Date">
                <input type="date" className={inputCls} value={editForm.target_date} onChange={e => setEditForm(p => ({ ...p, target_date: e.target.value }))} />
              </Field>
              <Field label="Target Hours">
                <input type="number" min="1" className={inputCls} value={editForm.target_hours} onChange={e => setEditForm(p => ({ ...p, target_hours: e.target.value }))} placeholder="—" />
              </Field>
              <Field label="Target Score %">
                <input type="number" min="1" max="100" className={inputCls} value={editForm.target_score_pct} onChange={e => setEditForm(p => ({ ...p, target_score_pct: e.target.value }))} placeholder="—" />
              </Field>
            </div>
            <div className="flex gap-3 mt-2">
              <button type="button" onClick={() => setEditGoal(null)}
                className="flex-1 py-3 rounded-xl border border-white/15 text-gray-400 hover:text-white font-semibold text-sm transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={editSaving}
                className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition-colors disabled:opacity-50">
                {editSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <Modal title="Delete Goal" onClose={() => setDeleteTarget(null)}>
          <p className="text-gray-400 text-sm mb-6">
            Delete <span className="text-white font-semibold">"{deleteTarget.title}"</span>? This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteTarget(null)}
              className="flex-1 py-3 rounded-xl border border-white/15 text-gray-400 hover:text-white font-semibold text-sm transition-colors">
              Cancel
            </button>
            <button onClick={handleDelete} disabled={deleting}
              className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors disabled:opacity-50">
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
});

export default GoalsSection;
