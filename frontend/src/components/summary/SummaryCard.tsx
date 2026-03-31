import type { Document } from "../../api/documents";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";

export type SummaryItem = Document & { workspaceTitle: string };

export default function SummaryCard({
  doc,
  summary,
  busy,
  showWorkspace,
  onSummarize,
}: {
  doc: SummaryItem;
  summary?: string;
  busy: boolean;
  showWorkspace: boolean;
  onSummarize: (doc: SummaryItem) => void;
}) {
  return (
    <Card className="flex h-full flex-col hover:bg-white/[0.06] hover:border-cyan-500/20 transition-all duration-200">
      <CardHeader className="items-start gap-3 p-5 pb-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate">{doc.original_filename}</CardTitle>
          {showWorkspace ? <CardDescription className="mt-1">{doc.workspaceTitle}</CardDescription> : null}
        </div>
        <button
          onClick={() => onSummarize(doc)}
          disabled={busy}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 disabled:opacity-50 transition-colors flex-shrink-0"
        >
          {busy ? (
            <>
              <span className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin" />
              Working
            </>
          ) : summary ? "Re-summarize" : "Summarize"}
        </button>
      </CardHeader>
      <CardContent className="pt-0">
        {summary ? (
          <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{summary}</pre>
        ) : busy ? (
          <div className="space-y-1.5 py-2 animate-pulse">
            <div className="h-2 rounded-full bg-white/5 w-full" />
            <div className="h-2 rounded-full bg-white/5 w-5/6" />
            <div className="h-2 rounded-full bg-white/5 w-4/6" />
          </div>
        ) : (
          <p className="text-xs text-gray-600 py-1">Click summarize to generate an AI summary for this document.</p>
        )}
      </CardContent>
      <CardFooter className="mt-auto flex items-center justify-between pt-0 text-xs text-gray-600">
        <span>{doc.status}</span>
        <span>{new Date(doc.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
      </CardFooter>
    </Card>
  );
}
