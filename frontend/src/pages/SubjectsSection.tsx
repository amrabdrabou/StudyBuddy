import { useState, useEffect, useRef } from "react";
import { getSubjects, createSubject, deleteSubject, updateSubject, type Subject } from "../api/subjects";
import { getBigGoals, updateBigGoal, type BigGoal } from "../api/big_goals";
import { getWorkspaces } from "../api/workspaces";
import { useNavStore } from "../store/navStore";
import SubjectCard from "../components/subjects/SubjectCard";
import ErrorBanner from "../components/ui/ErrorBanner";
import SkeletonGrid from "../components/ui/SkeletonGrid";
import Modal from "../components/ui/Modal";
import Field from "../components/ui/Field";

const inputCls =
  "w-full rounded-xl bg-white/[0.08] border border-white/15 px-4 py-3 text-white " +
  "placeholder:text-gray-600 outline-none text-sm " +
  "focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition";

export default function SubjectsSection() {
  const { navigate } = useNavStore();

  const [subjects, setSubjects]         = useState<Subject[]>([]);
  const [goals, setGoals]               = useState<BigGoal[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [activeMissionId, setActiveMissionId] = useState<string | null>(null);

  const [showCreate, setShowCreate]     = useState(false);
  const [name, setName]                 = useState("");
  const [saving, setSaving]             = useState(false);
  const [formErr, setFormErr]           = useState<string | null>(null);
  const nameRef                         = useRef<HTMLInputElement>(null);

  const [openingId, setOpeningId]       = useState<string | null>(null);

  useEffect(() => { load(); }, []);
  useEffect(() => { if (showCreate) setTimeout(() => nameRef.current?.focus(), 50); }, [showCreate]);

  async function load() {
    setLoading(true);
    try {
      const [subs, gs] = await Promise.all([getSubjects(), getBigGoals()]);
      setSubjects(subs);
      setGoals(gs);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true); setFormErr(null);
    try {
      const s = await createSubject({ name: name.trim() });
      // Link to active mission if one is selected
      if (activeMissionId) {
        const goal = goals.find(g => g.id === activeMissionId);
        if (goal) {
          const updated = await updateBigGoal(activeMissionId, {
            subject_ids: [...goal.subject_ids, s.id],
          });
          setGoals(prev => prev.map(g => g.id === activeMissionId ? { ...g, ...updated } : g));
        }
      }
      setSubjects(prev => [s, ...prev]);
      setShowCreate(false);
      setName("");
    } catch (e: unknown) {
      setFormErr(e instanceof Error ? e.message : "Failed to create subject");
    } finally {
      setSaving(false);
    }
  }

  async function handleOpenSubject(subject: Subject) {
    setOpeningId(subject.id);
    try {
      const workspaces = await getWorkspaces({ subject_id: subject.id });
      const ws = workspaces.find(w => w.status === "active") ?? workspaces[0];
      if (ws) {
        const goal = goals.find(g => g.subject_ids.includes(subject.id));
        navigate({ view: "workspace", workspace: ws, subject, ...(goal ? { goal } : {}) });
      }
    } catch {
      // silent
    } finally {
      setOpeningId(null);
    }
  }

  async function handleRename(s: Subject) {
    const newName = window.prompt("Rename subject:", s.name);
    if (!newName?.trim() || newName.trim() === s.name) return;
    try {
      const updated = await updateSubject(s.id, { name: newName.trim() });
      setSubjects(prev => prev.map(x => x.id === s.id ? updated : x));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to rename");
    }
  }

  async function handleDelete(s: Subject) {
    if (!confirm(`Delete subject "${s.name}"? This cannot be undone.`)) return;
    try {
      await deleteSubject(s.id);
      setSubjects(prev => prev.filter(x => x.id !== s.id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  const filteredSubjects = activeMissionId
    ? subjects.filter(s => goals.find(g => g.id === activeMissionId)?.subject_ids.includes(s.id))
    : subjects;

  const activeMission = goals.find(g => g.id === activeMissionId);

  return (
    <div className="flex flex-col gap-8 pb-24">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Subjects</h1>
          <p className="text-sm mt-1 text-gray-500">
            {subjects.length} subject{subjects.length !== 1 ? "s" : ""} · all your study topics across every mission
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-105 active:scale-95 flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#6366f1,#818cf8)", boxShadow: "0 4px 20px rgba(99,102,241,0.3)" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          New Subject
        </button>
      </div>

      {/* Mission filter pills */}
      {goals.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveMissionId(null)}
            className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
            style={activeMissionId === null
              ? { background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }
              : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.08)" }
            }
          >
            All Missions
          </button>
          {goals.map(g => (
            <button
              key={g.id}
              onClick={() => setActiveMissionId(g.id)}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              style={activeMissionId === g.id
                ? { background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }
                : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.08)" }
              }
            >
              {g.title}
            </button>
          ))}
        </div>
      )}

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {loading ? (
        <SkeletonGrid count={6} />
      ) : filteredSubjects.length === 0 ? (
        <div className="flex flex-col items-center gap-6 py-32 text-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)" }}>
            <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-xl">No subjects yet</p>
            <p className="text-sm mt-1 text-gray-500">
              {activeMissionId ? "No subjects in this mission yet." : "Create a subject to get started."}
            </p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="px-6 py-3 rounded-2xl font-bold text-white transition-colors"
            style={{ background: "#6366f1" }}>
            Create First Subject
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubjects.map((s, i) => (
            <div key={s.id} className="relative">
              {openingId === s.id && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/50 backdrop-blur-sm">
                  <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <SubjectCard
                subject={s}
                index={i}
                onClick={handleOpenSubject}
                onRename={handleRename}
                onDelete={handleDelete}
              />
            </div>
          ))}
        </div>
      )}


      {showCreate && (
        <Modal title="New Subject" onClose={() => { setShowCreate(false); setName(""); setFormErr(null); }}>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            {formErr && <p className="text-red-400 text-sm">{formErr}</p>}
            <Field label="Subject Name *">
              <input
                ref={nameRef}
                className={inputCls}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Linear Algebra"
                required
              />
            </Field>
            {activeMission && (
              <p className="text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-2 rounded-lg">
                Will be added to mission: <strong>{activeMission.title}</strong>
              </p>
            )}
            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => { setShowCreate(false); setName(""); setFormErr(null); }}
                className="flex-1 py-3 rounded-xl border border-white/15 text-gray-400 hover:text-white font-semibold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 rounded-xl text-white font-bold text-sm transition-colors disabled:opacity-50"
                style={{ background: "#6366f1" }}
              >
                {saving ? "Creating…" : "Create Subject"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
