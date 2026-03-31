import { useEffect, useState } from "react";

import { aiSummarize } from "../../api/ai";
import {
  getDocumentContent,
  getDocuments,
  type Document,
} from "../../api/documents";

export default function SummaryTab({ workspaceId }: { workspaceId: string }) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const nextDocs = await getDocuments(workspaceId);
        setDocs(nextDocs);
        const readyDocs = nextDocs.filter(d => d.status === "ready");
        if (readyDocs.length > 0) {
          const contents = await Promise.all(
            readyDocs.map(d => getDocumentContent(workspaceId, d.id).catch(() => null))
          );
          const initial: Record<string, string> = {};
          contents.forEach((content, index) => {
            if (content?.summary) initial[readyDocs[index].id] = content.summary;
          });
          setSummaries(initial);
        }
      } catch {
        // Keep the tab usable even if initial fetch fails.
      } finally {
        setLoading(false);
      }
    })();
  }, [workspaceId]);

  const handleSummarize = async (doc: Document) => {
    setGenerating(doc.id);
    setError("");
    try {
      const res = await aiSummarize(workspaceId, doc.id);
      setSummaries(prev => ({ ...prev, [doc.id]: res.summary }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Summarization failed. Check your API key.");
    } finally {
      setGenerating(null);
    }
  };

  if (loading) return <div className="text-gray-500 text-sm">Loading...</div>;

  const readyDocs = docs.filter(d => d.status === "ready");

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white">Document Summaries</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Click "Summarize" on any ready document to generate an AI summary.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {docs.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">No documents uploaded yet.</div>
      ) : readyDocs.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">Documents are still being processed.</div>
      ) : (
        <div className="space-y-3">
          {readyDocs.map(doc => {
            const summary = summaries[doc.id];
            const busy = generating === doc.id;
            return (
              <div key={doc.id} className="rounded-xl border border-white/5 overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 bg-white/5">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-white truncate flex-1">{doc.original_filename}</p>
                  <button
                    onClick={() => handleSummarize(doc)}
                    disabled={busy}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 disabled:opacity-50 transition-colors flex-shrink-0"
                  >
                    {busy ? (
                      <>
                        <span className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin" />
                        Generating...
                      </>
                    ) : summary ? (
                      <>Re-summarize</>
                    ) : (
                      <>Summarize</>
                    )}
                  </button>
                </div>

                <div className="px-4 py-3">
                  {summary ? (
                    <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{summary}</pre>
                  ) : busy ? (
                    <div className="space-y-1.5 py-2 animate-pulse">
                      <div className="h-2 rounded-full bg-white/5 w-full" />
                      <div className="h-2 rounded-full bg-white/5 w-5/6" />
                      <div className="h-2 rounded-full bg-white/5 w-4/6" />
                    </div>
                  ) : (
                    <p className="text-xs text-gray-600 py-1">
                      Click "Summarize" to generate an AI summary for this document.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
