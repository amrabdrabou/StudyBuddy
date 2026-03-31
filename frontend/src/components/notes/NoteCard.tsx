import type { Note } from "../../api/notes";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui/card";

export default function NoteCard({ note, subjectName, onEdit, onDelete }: {
  note: Note;
  subjectName?: string;
  onEdit: (n: Note) => void;
  onDelete: (n: Note) => void;
}) {
  return (
    <Card className="group hover:bg-white/[0.07] hover:border-violet-500/30 transition-all duration-200">
      <CardHeader className="p-5 pb-3">
        <div className="flex-1 min-w-0">
          <CardTitle className="truncate">{note.title ?? "Untitled"}</CardTitle>
          {subjectName && (
            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-400/20">
              {subjectName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => onEdit(note)} title="Edit"
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button onClick={() => onDelete(note)} title="Delete"
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-5 pt-0">
        {note.content && (
          <p className="text-sm text-gray-400 leading-relaxed line-clamp-3">{note.content}</p>
        )}
        {!note.content && (
          <p className="text-sm text-gray-600 italic">No content</p>
        )}
      </CardContent>
      <CardFooter className="text-xs text-gray-600 mt-auto">
        {new Date(note.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </CardFooter>
    </Card>
  );
}
