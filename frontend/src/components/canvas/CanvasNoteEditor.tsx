import { useEffect, useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import { useDebouncedCallback } from "use-debounce";
import { updateNote, type Note } from "../../api/notes";

// ── Toolbar button ──────────────────────────────────────────────────────────

function ToolBtn({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-colors ${
        active
          ? "bg-violet-500/30 text-violet-300"
          : "text-gray-400 hover:text-white hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

// ── Save status indicator ───────────────────────────────────────────────────

function SaveStatus({ status }: { status: "saved" | "saving" | "unsaved" }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {status === "saved" && (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-emerald-400">Saved</span>
        </>
      )}
      {status === "saving" && (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-amber-400">Saving…</span>
        </>
      )}
      {status === "unsaved" && (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
          <span className="text-gray-500">Unsaved</span>
        </>
      )}
    </div>
  );
}

// ── Main editor ─────────────────────────────────────────────────────────────

interface Props {
  note: Note;
  onClose: () => void;
  onSaved?: (updated: Note) => void;
}

export default function CanvasNoteEditor({ note, onClose, onSaved }: Props) {
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [titleValue, setTitleValue] = useState(note.title ?? "");

  // Parse stored JSON or start empty
  const initialContent = (() => {
    try {
      return note.content ? JSON.parse(note.content) : {};
    } catch {
      return {};
    }
  })();

  const doSave = useCallback(
    async (content: object, title: string) => {
      setSaveStatus("saving");
      try {
        const updated = await updateNote(note.id, {
          content: JSON.stringify(content),
          title: title || undefined,
        });
        setSaveStatus("saved");
        onSaved?.(updated);
      } catch {
        setSaveStatus("unsaved");
      }
    },
    [note.id, onSaved]
  );

  const debouncedSave = useDebouncedCallback(doSave, 1500);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({ multicolor: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: "Start writing…" }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      setSaveStatus("unsaved");
      debouncedSave(editor.getJSON(), titleValue);
    },
    editorProps: {
      attributes: {
        class: "outline-none min-h-[60vh] text-gray-200 leading-relaxed",
      },
    },
  });

  // Save on title change
  useEffect(() => {
    if (!editor) return;
    setSaveStatus("unsaved");
    debouncedSave(editor.getJSON(), titleValue);
  }, [titleValue]);

  // Flush on unmount
  useEffect(() => {
    return () => { debouncedSave.flush(); };
  }, [debouncedSave]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!editor) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-white/10 bg-gray-900/80 backdrop-blur flex-shrink-0">
        {/* Close */}
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white mr-3 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Text formatting */}
        <ToolBtn title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>B</ToolBtn>
        <ToolBtn title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <em>I</em>
        </ToolBtn>
        <ToolBtn title="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <s>S</s>
        </ToolBtn>
        <ToolBtn title="Highlight" active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()}>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.243 4.515l-6.738 6.737-.707 2.121-1.04 1.041 2.828 2.829 1.04-1.041 2.122-.707 6.737-6.738-4.242-4.242zm6.364 3.535a1 1 0 010 1.414L13.9 17.172l-2.12.707-1.415 1.415a1 1 0 01-1.414 0l-4.243-4.243a1 1 0 010-1.414l1.414-1.414.707-2.121L14.143 2.1a1 1 0 011.414 0l6.05 6.05zM4 20l-2 2 2-2z"/>
          </svg>
        </ToolBtn>

        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Headings */}
        <ToolBtn title="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>H1</ToolBtn>
        <ToolBtn title="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</ToolBtn>
        <ToolBtn title="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</ToolBtn>

        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Lists */}
        <ToolBtn title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
          </svg>
        </ToolBtn>
        <ToolBtn title="Ordered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 6h13M7 12h13M7 18h13M3 6h.01M3 12h.01M3 18h.01"/>
          </svg>
        </ToolBtn>
        <ToolBtn title="Task list" active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
          </svg>
        </ToolBtn>

        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Block */}
        <ToolBtn title="Blockquote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zm12 0c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>
          </svg>
        </ToolBtn>
        <ToolBtn title="Code block" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
          </svg>
        </ToolBtn>

        {/* Spacer */}
        <div className="flex-1" />

        <SaveStatus status={saveStatus} />
      </div>

      {/* ── Scrollable content area ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-12 px-6">

          {/* Title */}
          <input
            value={titleValue}
            onChange={e => setTitleValue(e.target.value)}
            placeholder="Note title…"
            className="w-full text-3xl font-extrabold bg-transparent text-white outline-none placeholder-gray-700 mb-8 tracking-tight"
          />

          {/* Editor */}
          <EditorContent editor={editor} className="prose-canvas" />
        </div>
      </div>
    </div>
  );
}
