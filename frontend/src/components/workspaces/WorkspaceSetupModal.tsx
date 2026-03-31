import { useState } from "react";
import { createNote } from "../../api/notes";
import type { Subject } from "../../api/subjects";
import { createWorkspace } from "../../api/workspaces";
import Modal from "../ui/Modal";

type SetupStep = "workspace" | "note" | "done";

export default function WorkspaceSetupModal({
  titleSeed,
  subjects,
  allowedSubjectIds,
  initialSubjectId,
  intro,
  onClose,
  onWorkspaceCreated,
}: {
  titleSeed: string;
  subjects: Subject[];
  allowedSubjectIds?: string[];
  initialSubjectId?: string;
  intro: React.ReactNode;
  onClose: () => void;
  onWorkspaceCreated?: (workspaceId: string, subjectId: string) => void;
}) {
  const pickableSubjects = allowedSubjectIds?.length
    ? subjects.filter(subject => allowedSubjectIds.includes(subject.id))
    : subjects;

  const [step, setStep] = useState<SetupStep>("workspace");
  const [workspaceTitle, setWorkspaceTitle] = useState(titleSeed);
  const [subjectId, setSubjectId] = useState(initialSubjectId ?? pickableSubjects[0]?.id ?? "");
  const [workspaceError, setWorkspaceError] = useState("");
  const [workspaceSaving, setWorkspaceSaving] = useState(false);
  const [createdWorkspaceId, setCreatedWorkspaceId] = useState("");
  const [createdSubjectId, setCreatedSubjectId] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteError, setNoteError] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  async function handleCreateWorkspace(e: React.FormEvent) {
    e.preventDefault();
    if (!subjectId) {
      setWorkspaceError("Please select a subject.");
      return;
    }

    setWorkspaceSaving(true);
    setWorkspaceError("");

    try {
      const workspace = await createWorkspace({
        subject_id: subjectId,
        title: workspaceTitle.trim() || titleSeed,
      });
      setCreatedWorkspaceId(workspace.id);
      setCreatedSubjectId(subjectId);
      onWorkspaceCreated?.(workspace.id, subjectId);
      setStep("note");
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Failed to create workspace.");
    } finally {
      setWorkspaceSaving(false);
    }
  }

  async function handleCreateNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteContent.trim()) {
      setNoteError("Note content is required.");
      return;
    }

    setNoteSaving(true);
    setNoteError("");

    try {
      await createNote({
        subject_id: createdSubjectId,
        workspace_id: createdWorkspaceId,
        title: noteTitle.trim() || undefined,
        content: noteContent.trim(),
      });
      setStep("done");
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : "Failed to create note.");
    } finally {
      setNoteSaving(false);
    }
  }

  if (step === "workspace") {
    return (
      <Modal title="Setup Workspace" onClose={onClose}>
        <form onSubmit={handleCreateWorkspace} className="space-y-4">
          <div className="text-xs text-gray-500">{intro}</div>

          {workspaceError && <p className="text-red-400 text-sm">{workspaceError}</p>}

          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Workspace title</label>
            <input
              autoFocus
              value={workspaceTitle}
              onChange={e => setWorkspaceTitle(e.target.value)}
              placeholder="e.g. Linear Algebra Study"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {pickableSubjects.length > 0 ? (
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Subject</label>
              <div className="flex flex-wrap gap-2">
                {pickableSubjects.map(subject => (
                  <button
                    type="button"
                    key={subject.id}
                    onClick={() => setSubjectId(subject.id)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      subjectId === subject.id
                        ? "bg-indigo-500/20 border-indigo-500 text-indigo-300"
                        : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                    }`}
                  >
                    {subject.name}
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
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-white/15 text-gray-400 hover:text-white font-semibold text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={workspaceSaving || !subjectId}
              className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors disabled:opacity-50"
            >
              {workspaceSaving ? "Creating..." : "Create Workspace"}
            </button>
          </div>
        </form>
      </Modal>
    );
  }

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
              placeholder="Write your first note here..."
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setStep("done")}
              className="flex-1 py-3 rounded-xl border border-white/15 text-gray-400 hover:text-white font-semibold text-sm transition-colors"
            >
              Skip
            </button>
            <button
              type="submit"
              disabled={noteSaving || !noteContent.trim()}
              className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors disabled:opacity-50"
            >
              {noteSaving ? "Saving..." : "Save Note"}
            </button>
          </div>
        </form>
      </Modal>
    );
  }

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
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors"
        >
          Done
        </button>
      </div>
    </Modal>
  );
}
