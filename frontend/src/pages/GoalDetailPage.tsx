import { useState, useEffect } from "react";
import { updateBigGoal, type BigGoal } from "../api/big_goals";
import { getSubjects, createSubject, type Subject } from "../api/subjects";
import Modal from "../components/ui/Modal";
import { useNavStore } from "../store/navStore";

function AddSubjectsModal({
  goal, allSubjects, onSaved, onClose,
}: { goal: BigGoal; allSubjects: Subject[]; onSaved: (g: BigGoal) => void; onClose: () => void }) {
  const [checkedIds, setCheckedIds] = useState(new Set(goal.subject_ids));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggle = (id: string) => setCheckedIds(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const save = async () => {
    setSaving(true);
    try {
      const updated = await updateBigGoal(goal.id, { subject_ids: [...checkedIds] });
      onSaved(updated); onClose();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="Link Subjects" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-gray-500">Choose subjects linked to <span className="text-white font-medium">"{goal.title}"</span>.</p>
        {allSubjects.length === 0
          ? <p className="text-sm text-gray-500 py-4 text-center">No subjects yet. Create one below.</p>
          : <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {allSubjects.map(s => {
                const checked = checkedIds.has(s.id);
                return (
                  <button key={s.id} type="button" onClick={() => toggle(s.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                      checked ? "bg-violet-500/15 border-violet-500/40 text-white" : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                    }`}>
                    <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${checked ? "bg-violet-500 border-violet-500" : "border-gray-600"}`}>
                      {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                    </div>
                    <span className="text-lg">{s.icon ?? "📚"}</span>
                    <span className="font-medium text-sm">{s.name}</span>
                  </button>
                );
              })}
            </div>
        }
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-white/15 text-gray-400 hover:text-white font-semibold text-sm transition-colors">Cancel</button>
          <button type="button" onClick={save} disabled={saving}
            className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition-colors disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function CreateSubjectModal({ onCreated, onClose }: { onCreated: (s: Subject) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const COLORS = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#06b6d4"];
  const ICONS  = ["📚","🔬","📐","🧠","💡","🎯","✍️","💻","🎓","📝","🏆","🚀"];
  const [color, setColor] = useState(COLORS[0]);
  const [icon, setIcon]   = useState(ICONS[0]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const s = await createSubject({ name: name.trim(), color_hex: color, icon });
      onCreated(s); onClose();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="New Subject" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <input autoFocus value={name} onChange={e => setName(e.target.value)} required
          placeholder="Subject name…"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"/>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => <button type="button" key={c} onClick={() => setColor(c)}
                className="w-6 h-6 rounded-full border-2 transition-all"
                style={{ background: c, borderColor: color === c ? "white" : "transparent", transform: color === c ? "scale(1.3)" : "scale(1)" }}/>)}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Icon</label>
            <div className="flex flex-wrap gap-1">
              {ICONS.map(em => <button type="button" key={em} onClick={() => setIcon(em)}
                className={`w-7 h-7 rounded-lg text-sm transition-all ${icon === em ? "bg-white/20 scale-110" : "bg-white/5 hover:bg-white/10"}`}>{em}</button>)}
            </div>
          </div>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-white/15 text-gray-400 hover:text-white font-semibold text-sm transition-colors">Cancel</button>
          <button type="submit" disabled={saving || !name.trim()}
            className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors disabled:opacity-50">
            {saving ? "Creating…" : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function GoalDetailPage({ goal: initialGoal }: { goal: BigGoal }) {
  const { toGoals, toSubject, onGoalUpdate, goBack } = useNavStore();
  const nav = { toGoals, toSubject, onGoalUpdate, goBack };
  const [goal, setGoal]         = useState(initialGoal);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showLinkSubjects, setShowLinkSubjects] = useState(false);
  const [showCreateSubject, setShowCreateSubject] = useState(false);

  const load = async () => {
    try { setAllSubjects(await getSubjects()); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const goalSubjects = allSubjects.filter(s => goal.subject_ids.includes(s.id));
  const color = goal.cover_color ?? "#6366f1";

  const handleSubjectCreated = async (s: Subject) => {
    // Auto-link new subject to this goal
    const updated = await updateBigGoal(goal.id, { subject_ids: [...goal.subject_ids, s.id] });
    setGoal(updated);
    nav.onGoalUpdate(updated);
    setAllSubjects(prev => [...prev, s]);
  };

  const handleGoalUpdated = (updated: BigGoal) => {
    setGoal(updated);
    nav.onGoalUpdate(updated);
  };

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button onClick={nav.goBack} className="text-gray-500 hover:text-white transition-colors">Missions</button>
        <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
        </svg>
        <span className="text-white font-medium">{goal.title}</span>
      </div>

      {/* Goal header card */}
      <div className="relative overflow-hidden rounded-2xl border p-6"
        style={{ background: `${color}08`, borderColor: `${color}25` }}>
        <div className="h-0.5 absolute top-0 left-0 right-0" style={{ background: color }} />
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
              {goal.icon ?? "🎯"}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">{goal.title}</h1>
              {goal.description && <p className="text-sm text-gray-400 mt-0.5">{goal.description}</p>}
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                {goal.deadline && <span>Due {new Date(goal.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>}
                <span>{goal.subject_ids.length} subjects</span>
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">Progress</span>
              <span className="font-bold" style={{ color }}>{goal.progress_pct}%</span>
            </div>
            <div className="w-32 h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${goal.progress_pct}%`, background: color }} />
            </div>
          </div>
        </div>
      </div>

      {/* Subjects section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Subjects</h2>
          <div className="flex gap-2">
            <button onClick={() => setShowLinkSubjects(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-white/5 text-gray-400 border border-white/10 hover:text-white hover:border-white/20 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.1-1.1m-.757-4.9a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
              </svg>
              Link Existing
            </button>
            <button onClick={() => setShowCreateSubject(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl text-white font-semibold transition-colors"
              style={{ background: `${color}25`, border: `1px solid ${color}40` }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
              </svg>
              New Subject
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-32 rounded-2xl bg-white/[0.04] animate-pulse"/>)}
          </div>
        ) : goalSubjects.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl">📚</div>
            <div>
              <p className="text-white font-semibold">No subjects yet</p>
              <p className="text-gray-500 text-sm mt-1">Create a subject to organize your study materials</p>
            </div>
            <button onClick={() => setShowCreateSubject(true)}
              className="px-4 py-2 rounded-xl text-white text-sm font-bold transition-colors"
              style={{ background: color }}>
              Create Subject
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {goalSubjects.map(s => {
              const sColor = s.color_hex ?? "#6366f1";
              return (
                <div key={s.id}
                  onClick={() => nav.toSubject(goal, s)}
                  className="group p-5 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg"
                  style={{ background: `${sColor}0a`, borderColor: `${sColor}20` }}>
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: `${sColor}20`, border: `1px solid ${sColor}30` }}>
                      {s.icon ?? "📚"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white truncate">{s.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(s.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <svg className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors mt-0.5"
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                    </svg>
                  </div>
                  <p className="text-xs font-semibold" style={{ color: sColor }}>Open Workspaces →</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showLinkSubjects && (
        <AddSubjectsModal
          goal={goal} allSubjects={allSubjects}
          onSaved={handleGoalUpdated}
          onClose={() => setShowLinkSubjects(false)}
        />
      )}
      {showCreateSubject && (
        <CreateSubjectModal
          onCreated={handleSubjectCreated}
          onClose={() => setShowCreateSubject(false)}
        />
      )}
    </div>
  );
}
