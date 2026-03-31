import { useState, useEffect, useRef } from "react";
import { getSubjects, createSubject, deleteSubject, updateSubject, type Subject } from "../api/subjects";
import { getBigGoals, updateBigGoal, type BigGoal } from "../api/big_goals";
import { getWorkspaces, type Workspace } from "../api/workspaces";
import { useNavStore } from "../store/navStore";
import SubjectCard from "../components/subjects/SubjectCard";
import FilterPillGroup from "../components/ui/FilterPillGroup";
import MainCollectionPage from "../components/ui/MainCollectionPage";
import SkeletonGrid from "../components/ui/SkeletonGrid";
import Modal from "../components/ui/Modal";
import RenameModal from "../components/ui/RenameModal";
import Field from "../components/ui/Field";

const inputCls =
  "w-full rounded-xl bg-white/[0.08] border border-white/15 px-4 py-3 text-white " +
  "placeholder:text-gray-600 outline-none text-sm " +
  "focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition";

export default function SubjectsSection() {
  const { navState, toGoals, toSubject } = useNavStore();

  const [subjects, setSubjects]         = useState<Subject[]>([]);
  const [goals, setGoals]               = useState<BigGoal[]>([]);
  const [workspaces, setWorkspaces]     = useState<Workspace[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [activeMissionId, setActiveMissionId] = useState<string | null>(navState.goal?.id ?? null);
  const [filterState, setFilterState]   = useState<"all" | "ready" | "needs_workspace" | "needs_mission">("all");

  const [showCreate, setShowCreate]     = useState(false);
  const [name, setName]                 = useState("");
  const [saving, setSaving]             = useState(false);
  const [formErr, setFormErr]           = useState<string | null>(null);
  const nameRef                         = useRef<HTMLInputElement>(null);
  const addAnotherRef                   = useRef(false);
  const [createMissionId, setCreateMissionId] = useState<string | null>(navState.goal?.id ?? null);
  const [renameSubject, setRenameSubject] = useState<Subject | null>(null);
  const [renameSaving, setRenameSaving] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  useEffect(() => { load(); }, []);
  useEffect(() => { if (showCreate) setTimeout(() => nameRef.current?.focus(), 50); }, [showCreate]);

  async function load() {
    setLoading(true);
    try {
      const [subs, gs, ws] = await Promise.all([getSubjects(), getBigGoals(), getWorkspaces()]);
      setSubjects(subs);
      setGoals(gs);
      setWorkspaces(ws);
      const preferredMissionId = navState.goal?.id && gs.some(g => g.id === navState.goal?.id)
        ? navState.goal.id
        : gs.length === 1
          ? gs[0].id
          : null;
      setActiveMissionId(prev => prev && gs.some(g => g.id === prev) ? prev : preferredMissionId);
      setCreateMissionId(prev => prev && gs.some(g => g.id === prev) ? prev : preferredMissionId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    if (goals.length === 0) {
      toGoals();
      return;
    }
    setCreateMissionId(activeMissionId ?? navState.goal?.id ?? goals[0]?.id ?? null);
    setFormErr(null);
    setName("");
    setShowCreate(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (goals.length > 0 && !createMissionId) {
      setFormErr("Choose a mission so this subject stays in your study flow.");
      return;
    }
    const shouldAddAnother = addAnotherRef.current;
    addAnotherRef.current = false;
    setSaving(true); setFormErr(null);
    try {
      const s = await createSubject({ name: name.trim() });
      if (createMissionId) {
        const goal = goals.find(g => g.id === createMissionId);
        if (goal) {
          const updated = await updateBigGoal(createMissionId, {
            subject_ids: [...goal.subject_ids, s.id],
          });
          setGoals(prev => prev.map(g => g.id === createMissionId ? { ...g, ...updated } : g));
          setActiveMissionId(createMissionId);
        }
      }
      setSubjects(prev => [s, ...prev]);
      if (shouldAddAnother) {
        setName("");
        setFormErr(null);
        setTimeout(() => nameRef.current?.focus(), 50);
      } else {
        setShowCreate(false);
        setName("");
      }
    } catch (e: unknown) {
      setFormErr(e instanceof Error ? e.message : "Failed to create subject");
    } finally {
      setSaving(false);
    }
  }

  async function handleOpenSubject(subject: Subject) {
    const linkedGoals = goals.filter(g => g.subject_ids.includes(subject.id));
    const preferredGoal =
      (activeMissionId ? linkedGoals.find(g => g.id === activeMissionId) : undefined) ??
      (navState.goal ? linkedGoals.find(g => g.id === navState.goal?.id) : undefined) ??
      linkedGoals[0];

    if (!preferredGoal) {
      setError(`"${subject.name}" is not linked to a mission yet. Link it from a mission first to keep the study sequence intact.`);
      return;
    }

    toSubject(preferredGoal, subject);
  }

  async function handleRename(s: Subject) {
    setRenameError(null);
    setRenameSubject(s);
  }

  async function submitRename(name: string) {
    if (!renameSubject) return;
    setRenameSaving(true);
    try {
      const updated = await updateSubject(renameSubject.id, { name });
      setSubjects(prev => prev.map(x => x.id === renameSubject.id ? updated : x));
      setRenameSubject(null);
    } catch (e: unknown) {
      setRenameError(e instanceof Error ? e.message : "Failed to rename subject");
    } finally {
      setRenameSaving(false);
    }
  }

  async function handleDelete(s: Subject) {
    if (!confirm(`Delete subject "${s.name}"? This cannot be undone.`)) return;
    try {
      await deleteSubject(s.id);
      setSubjects(prev => prev.filter(x => x.id !== s.id));
      setWorkspaces(prev => prev.filter(x => x.subject_id !== s.id));
      setGoals(prev => prev.map(goal => (
        goal.subject_ids.includes(s.id)
          ? { ...goal, subject_ids: goal.subject_ids.filter(id => id !== s.id) }
          : goal
      )));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  const activeMission = goals.find(g => g.id === activeMissionId);
  const workspaceCountBySubject = workspaces.reduce<Record<string, number>>((acc, workspace) => {
    acc[workspace.subject_id] = (acc[workspace.subject_id] ?? 0) + 1;
    return acc;
  }, {});
  const linkedGoalsBySubject = goals.reduce<Record<string, BigGoal[]>>((acc, goal) => {
    goal.subject_ids.forEach(subjectId => {
      acc[subjectId] = [...(acc[subjectId] ?? []), goal];
    });
    return acc;
  }, {});
  const filteredSubjects = subjects
    .filter(subject => activeMissionId ? goals.find(g => g.id === activeMissionId)?.subject_ids.includes(subject.id) : true)
    .filter(subject => {
      const linkedGoals = linkedGoalsBySubject[subject.id] ?? [];
      const workspaceCount = workspaceCountBySubject[subject.id] ?? 0;

      switch (filterState) {
        case "ready":
          return linkedGoals.length > 0 && workspaceCount > 0;
        case "needs_workspace":
          return linkedGoals.length > 0 && workspaceCount === 0;
        case "needs_mission":
          return linkedGoals.length === 0;
        default:
          return true;
      }
    });
  const createTargetMission = goals.find(g => g.id === createMissionId) ?? activeMission ?? null;

  return (
    <>
      <MainCollectionPage
        title="Subjects"
        description={
          activeMission
            ? `${filteredSubjects.length} subject${filteredSubjects.length !== 1 ? "s" : ""} in ${activeMission.title}`
            : `${subjects.length} subject${subjects.length !== 1 ? "s" : ""} across your learning plan`
        }
        actions={
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-105 active:scale-95 flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#6366f1,#818cf8)", boxShadow: "0 4px 20px rgba(99,102,241,0.3)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            {goals.length === 0 ? "Create Mission First" : activeMission ? "New Subject in Mission" : "New Subject"}
          </button>
        }
        error={error}
        onDismissError={() => setError(null)}
        filters={
          <>
            {goals.length > 0 && (
              <FilterPillGroup
                options={[{ id: "all-missions", label: "All Missions" }, ...goals.map(g => ({ id: g.id, label: g.title }))]}
                value={activeMissionId ?? "all-missions"}
                onChange={value => setActiveMissionId(value === "all-missions" ? null : value)}
                tone="indigo"
              />
            )}

            <FilterPillGroup
              options={[
                { id: "all", label: "all" },
                { id: "ready", label: "ready" },
                { id: "needs_workspace", label: "needs workspace" },
                { id: "needs_mission", label: "needs mission" },
              ]}
              value={filterState}
              onChange={setFilterState}
              tone="indigo"
              compact
            />
          </>
        }
        loading={loading}
        loadingFallback={<SkeletonGrid count={6} />}
        isEmpty={filteredSubjects.length === 0}
        emptyState={{
          tone: "indigo",
          icon: (
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          ),
          title: goals.length === 0 ? "Create a mission first" : "No subjects yet",
          description: goals.length === 0
            ? "Subjects work best when they belong to a mission. Start there, then come back here."
            : activeMissionId
              ? "No subjects in this mission match the current filters yet."
              : filterState === "ready"
                ? "No subjects are fully set up yet. Add a workspace to any linked subject."
                : filterState === "needs_workspace"
                  ? "Every linked subject already has at least one workspace."
                  : filterState === "needs_mission"
                    ? "All current subjects are already linked to a mission."
                    : "Choose a mission or create a subject to get started.",
          action: (
            <button onClick={goals.length === 0 ? toGoals : openCreateModal}
              className="px-6 py-3 rounded-2xl font-bold text-white transition-colors"
              style={{ background: "#6366f1" }}>
              {goals.length === 0 ? "Create First Mission" : activeMission ? "Create First Subject" : "Create Subject"}
            </button>
          ),
        }}
      >
        {filteredSubjects.map((s, i) => (
          <SubjectCard
            key={s.id}
            subject={s}
            index={i}
            missionTitle={
              (activeMissionId
                ? goals.find(g => g.id === activeMissionId && g.subject_ids.includes(s.id))
                : goals.find(g => g.subject_ids.includes(s.id)))?.title
            }
            workspaceCount={workspaceCountBySubject[s.id] ?? 0}
            needsMission={!goals.some(g => g.subject_ids.includes(s.id))}
            onClick={handleOpenSubject}
            onRename={handleRename}
            onDelete={handleDelete}
          />
        ))}
      </MainCollectionPage>

      {showCreate && (
        <Modal
          title={createTargetMission ? `New Subject in ${createTargetMission.title}` : "New Subject"}
          onClose={() => { setShowCreate(false); setName(""); setFormErr(null); }}
        >
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            {formErr && <p className="text-red-400 text-sm">{formErr}</p>}
            {goals.length > 0 && (
              <Field label="Mission *">
                <div className="flex flex-wrap gap-2">
                  {goals.map(goal => (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => setCreateMissionId(goal.id)}
                      className="px-3 py-2 rounded-xl text-sm font-semibold transition-colors"
                      style={createMissionId === goal.id
                        ? { background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }
                        : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}
                    >
                      {goal.title}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Subjects sit inside a mission first, then open into workspaces.
                </p>
              </Field>
            )}
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
            {createTargetMission && (
              <p className="text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-2 rounded-lg">
                Next step after creation: open the subject and create its first workspace inside <strong>{createTargetMission.title}</strong>.
              </p>
            )}
            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => { setShowCreate(false); setName(""); setFormErr(null); }}
                className="py-3 px-4 rounded-xl border border-white/15 text-gray-400 hover:text-white font-semibold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !name.trim()}
                onClick={() => { addAnotherRef.current = true; }}
                className="flex-1 py-3 rounded-xl border border-indigo-500/40 text-indigo-300 hover:text-white font-semibold text-sm transition-colors disabled:opacity-50"
                style={{ background: "rgba(99,102,241,0.12)" }}
              >
                {saving && addAnotherRef.current ? "Creating…" : "Save & Add Another"}
              </button>
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="flex-1 py-3 rounded-xl text-white font-bold text-sm transition-colors disabled:opacity-50"
                style={{ background: "#6366f1" }}
              >
                {saving && !addAnotherRef.current ? "Creating…" : "Create Subject"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {renameSubject && (
        <RenameModal
          title="Rename Subject"
          label="Subject name"
          initialValue={renameSubject.name}
          placeholder="Subject name"
          confirmLabel="Save Subject"
          saving={renameSaving}
          error={renameError ?? ""}
          onClose={() => { setRenameSubject(null); setRenameError(null); }}
          onSubmit={submitRename}
        />
      )}
    </>
  );
}
