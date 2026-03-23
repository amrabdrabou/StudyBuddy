import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import type { DocumentContent } from "../../api/documents";

// Convert raw text to Tiptap JSON — split on blank lines to make paragraphs
function rawTextToTiptap(text: string) {
  const paragraphs = text.split(/\n{2,}/).filter(p => p.trim()).slice(0, 300);
  return {
    type: "doc",
    content: paragraphs.map(p => ({
      type: "paragraph",
      content: [{ type: "text", text: p.replace(/\n/g, " ").trim() }],
    })),
  };
}

interface Props {
  filename: string;
  content: DocumentContent;
  onClose: () => void;
}

export default function DocumentCanvasViewer({ filename, content, onClose }: Props) {
  const title = filename.replace(/\.[^.]+$/, "");

  const initialContent = content.raw_text ? rawTextToTiptap(content.raw_text) : { type: "doc", content: [] };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({ multicolor: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: initialContent,
    editable: false,
    editorProps: {
      attributes: { class: "outline-none min-h-[60vh] text-gray-200 leading-relaxed" },
    },
  });

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!editor) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-white/10 bg-gray-900/80 backdrop-blur flex-shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="w-px h-5 bg-white/10" />

        {/* Read-only badge */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Document · Read-only
        </div>

        <div className="flex-1" />

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-gray-600">
          {content.word_count != null && <span>{content.word_count.toLocaleString()} words</span>}
          {content.page_count != null && <span>{content.page_count} pages</span>}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-12 px-6">
          <h1 className="text-3xl font-extrabold text-white mb-8 tracking-tight">{title}</h1>

          {/* AI Summary */}
          <div className="mb-8 rounded-xl border border-violet-500/20 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-violet-500/10">
              <svg className="w-3.5 h-3.5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">AI Summary</p>
              {!content.summary && (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 font-medium">Coming Soon</span>
              )}
            </div>
            <div className="px-4 py-3">
              {content.summary ? (
                <p className="text-sm text-gray-300 leading-relaxed">{content.summary}</p>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="h-2.5 rounded-full bg-white/5 w-full" />
                    <div className="h-2.5 rounded-full bg-white/5 w-4/5" />
                    <div className="h-2.5 rounded-full bg-white/5 w-3/5" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {content.raw_text ? (
            <EditorContent editor={editor} className="prose-canvas" />
          ) : (
            <p className="text-gray-500 text-sm">No extracted text available for this document.</p>
          )}
        </div>
      </div>
    </div>
  );
}
