import { useEffect, useRef, useState } from "react";
import { updateBigGoal, type BigGoal } from "../api/big_goals";
import { createSubject, getSubjects, type Subject } from "../api/subjects";
import MainDetailPage from "../components/ui/MainDetailPage";
import Modal from "../components/ui/Modal";
import RenameModal from "../components/ui/RenameModal";
import { PageGrid, PageSection } from "../components/ui/pageLayout";
import { useNavStore } from "../store/navStore";
import GoalSubjectCard from "../components/subjects/GoalSubjectCard";

function AddSubjectsModal({
  goal,
  allSubjects,
  onSaved,
  onClose,
}: {
  goal: BigGoal;
  allSubjects: Subject[];
  onSaved: (goal: BigGoal) => void;
  onClose: () => void;
}) {
  const [checkedIds, setCheckedIds] = useState(new Set(goal.subject_ids));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggle = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const updated = await updateBigGoal(goal.id, { subject_ids: [...checkedIds] });
      onSaved(updated);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Link Subjects" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-gray-500">
          Choose subjects linked to <span className="text-white font-medium">&quot;{goal.title}&quot;</span>.
        </p>
        {allSubjects.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">No subjects yet. Create one below.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {allSubjects.map((subject) => {
              const checked = checkedIds.has(subject.id);
              return (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() => toggle(subject.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                    checked
                      ? "bg-violet-500/15 border-violet-500/40 text-white"
                      : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                    checked ? "bg-violet-500 border-violet-500" : "border-gray-600"
                  }`}>
                    {checked && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-lg">{subject.icon ?? "S"}</span>
                  <span className="font-medium text-sm">{subject.name}</span>
                </button>
              );
            })}
          </div>
        )}
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-white/15 text-gray-400 hover:text-white font-semibold text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function CreateSubjectModal({ onCreated, onClose }: { onCreated: (subject: Subject) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [addedCount, setAddedCount] = useState(0);
  const [color, setColor] = useState("#6366f1");
  const [icon, setIcon] = useState("Book");
  const nameRef = useRef<HTMLInputElement>(null);
  const addAnotherRef = useRef(false);
  const colors = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#06b6d4"];
  const icons = ["Book", "Lab", "Math", "Brain", "Idea", "Target", "Write", "Code"];

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const addAnother = addAnotherRef.current;
    addAnotherRef.current = false;
    setSaving(true);

    try {
      const subject = await createSubject({ name: name.trim(), color_hex: color, icon });
      onCreated(subject);
      if (addAnother) {
        setName("");
        setError("");
        setAddedCount((prev) => prev + 1);
        setTimeout(() => nameRef.current?.focus(), 50);
      } else {
        onClose();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="New Subject" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        {addedCount > 0 && (
          <p className="text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-2 rounded-lg">
            {addedCount} subject{addedCount !== 1 ? "s" : ""} added. Keep going or close when done.
          </p>
        )}
        <input
          ref={nameRef}
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Subject name..."
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Color</label>
            <div className="flex flex-wrap gap-2">
              {colors.map((value) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setColor(value)}
                  className="w-6 h-6 rounded-full border-2 transition-all"
                  style={{
                    background: value,
                    borderColor: color === value ? "white" : "transparent",
                    transform: color === value ? "scale(1.3)" : "scale(1)",
                  }}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Icon</label>
            <div className="flex flex-wrap gap-1">
              {icons.map((value) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setIcon(value)}
                  className={`px-2 py-1 rounded-lg text-xs transition-all ${
                    icon === value ? "bg-white/20 scale-110" : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-4 rounded-xl border border-white/15 text-gray-400 hover:text-white font-semibold text-sm transition-colors"
          >
            {addedCount > 0 ? "Done" : "Cancel"}
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            onClick={() => {
              addAnotherRef.current = true;
            }}
            className="flex-1 py-3 rounded-xl border border-indigo-500/40 text-indigo-300 hover:text-white font-semibold text-sm transition-colors disabled:opacity-50"
            style={{ background: "rgba(99,102,241,0.12)" }}
          >
            Save & Add Another
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function GoalDetailPage({ goal: initialGoal }: { goal: BigGoal }) {
  const { toSubject, onGoalUpdate, goBack } = useNavStore();
  const [goal, setGoal] = useState(initialGoal);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLinkSubjects, setShowLinkSubjects] = useState(false);
  const [showCreateSubject, setShowCreateSubject] = useState(false);
  const [showRenameGoal, setShowRenameGoal] = useState(false);
  const [renameSaving, setRenameSaving] = useState(false);
  const [renameError, setRenameError] = useState("");

  const color = goal.cover_color ?? "#6366f1";
  const goalSubjects = allSubjects.filter((subject) => goal.subject_ids.includes(subject.id));

  useEffect(() => {
    const load = async () => {
      try {
        setAllSubjects(await getSubjects());
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handleGoalUpdated = (updated: BigGoal) => {
    setGoal(updated);
    onGoalUpdate(updated);
  };

  const handleSubjectCreated = async (subject: Subject) => {
    const updated = await updateBigGoal(goal.id, { subject_ids: [...goal.subject_ids, subject.id] });
    handleGoalUpdated(updated);
    setAllSubjects((prev) => [...prev, subject]);
  };

  const handleRenameGoal = async (title: string) => {
    setRenameSaving(true);
    setRenameError("");
    try {
      const updated = await updateBigGoal(goal.id, { title });
      handleGoalUpdated(updated);
      setShowRenameGoal(false);
    } catch (e: unknown) {
      setRenameError(e instanceof Error ? e.message : "Failed to rename mission");
    } finally {
      setRenameSaving(false);
    }
  };

  const toggleGoalStatus = async () => {
    const updated = await updateBigGoal(goal.id, { status: goal.status === "active" ? "paused" : "active" });
    handleGoalUpdated(updated);
  };

  return (
    <MainDetailPage
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm">
          <button onClick={goBack} className="text-gray-500 hover:text-white transition-colors">
            Missions
          </button>
          <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-white font-medium">{goal.title}</span>
        </div>
      }
      title={goal.title}
      description={goal.description}
      meta={
        <>
          {goal.deadline && (
            <span>
              Due {new Date(goal.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </span>
          )}
          <span>{goal.subject_ids.length} subjects</span>
        </>
      }
      icon={<span className="text-3xl">{goal.icon ?? "Target"}</span>}
      accentColor={color}
      actions={
        <div className="space-y-3">
          <button
            onClick={() => {
              setRenameError("");
              setShowRenameGoal(true);
            }}
            className="w-full text-xs px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 transition-colors"
          >
            Rename Mission
          </button>
          <button
            onClick={() => void toggleGoalStatus()}
            className="w-full text-xs px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 transition-colors"
          >
            {goal.status === "active" ? "Pause" : "Resume"} Mission
          </button>
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
      }
    >
      <PageSection>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Subjects</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowLinkSubjects(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-white/5 text-gray-400 border border-white/10 hover:text-white hover:border-white/20 transition-colors"
            >
              Link Existing
            </button>
            <button
              onClick={() => setShowCreateSubject(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl text-white font-semibold transition-colors"
              style={{ background: `${color}25`, border: `1px solid ${color}40` }}
            >
              New Subject
            </button>
          </div>
        </div>

        {loading ? (
          <PageGrid>
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-32 rounded-2xl bg-white/[0.04] animate-pulse" />
            ))}
          </PageGrid>
        ) : goalSubjects.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-sm">SUB</div>
            <div>
              <p className="text-white font-semibold">No subjects yet</p>
              <p className="text-gray-500 text-sm mt-1">Create a subject to organize your study materials.</p>
            </div>
            <button
              onClick={() => setShowCreateSubject(true)}
              className="px-4 py-2 rounded-xl text-white text-sm font-bold transition-colors"
              style={{ background: color }}
            >
              Create Subject
            </button>
          </div>
        ) : (
          <PageGrid>
            {goalSubjects.map((subject) => (
              <GoalSubjectCard
                key={subject.id}
                subject={subject}
                onClick={(s) => toSubject(goal, s)}
              />
            ))}
          </PageGrid>
        )}
      </PageSection>

      {showLinkSubjects && (
        <AddSubjectsModal
          goal={goal}
          allSubjects={allSubjects}
          onSaved={handleGoalUpdated}
          onClose={() => setShowLinkSubjects(false)}
        />
      )}
      {showCreateSubject && (
        <CreateSubjectModal
          onCreated={(subject) => {
            void handleSubjectCreated(subject);
          }}
          onClose={() => setShowCreateSubject(false)}
        />
      )}
      {showRenameGoal && (
        <RenameModal
          title="Rename Mission"
          label="Mission title"
          initialValue={goal.title}
          placeholder="Mission title"
          confirmLabel="Save Mission"
          saving={renameSaving}
          error={renameError}
          onClose={() => {
            setShowRenameGoal(false);
            setRenameError("");
          }}
          onSubmit={handleRenameGoal}
        />
      )}
    </MainDetailPage>
  );
}
