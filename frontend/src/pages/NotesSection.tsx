import { useState, useEffect } from "react";
import { getNotes, deleteNote, type Note } from "../api/notes";
import { getSubjects, type Subject } from "../api/subjects";
import NoteCard from "../components/notes/NoteCard";
import ErrorBanner from "../components/ui/ErrorBanner";
import SkeletonGrid from "../components/ui/SkeletonGrid";

export default function NotesSection() {
  const [notes, setNotes]       = useState<Note[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const load = async () => {
    try {
      const [n, s] = await Promise.all([getNotes(), getSubjects()]);
      setNotes(n);
      setSubjects(s);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s.name]));

  const handleDelete = async (note: Note) => {
    if (!confirm(`Delete "${note.title ?? "Untitled"}"? This cannot be undone.`)) return;
    try {
      await deleteNote(note.id);
      setNotes(prev => prev.filter(n => n.id !== note.id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-24">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Notes</h1>
        <p className="text-sm mt-1 text-gray-500">All captured insights across your workspaces.</p>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {loading ? (
        <SkeletonGrid count={6} />
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center gap-6 py-32 text-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(236,72,153,0.15)", border: "1px solid rgba(236,72,153,0.3)" }}>
            <svg className="w-10 h-10 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-xl">No notes yet</p>
            <p className="text-sm mt-1 text-gray-500">Open a workspace and start capturing your insights.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map(n => (
            <NoteCard
              key={n.id}
              note={n}
              subjectName={subjectMap[n.subject_id]}
              onEdit={setEditingNote}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Inline edit note — opens the note content in a simple modal */}
      {editingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg space-y-4">
            <h2 className="text-white font-bold">{editingNote.title ?? "Untitled"}</h2>
            <p className="text-gray-400 text-sm whitespace-pre-wrap">{editingNote.content}</p>
            <button
              onClick={() => setEditingNote(null)}
              className="px-4 py-2 rounded-xl bg-white/10 text-gray-300 hover:bg-white/20 text-sm font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
