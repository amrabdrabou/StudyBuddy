import { useState, useEffect } from "react";
import { getWorkspaces, type Workspace } from "../api/workspaces";
import { getDocuments, getDocumentContent, type Document } from "../api/documents";
import { aiSummarize } from "../api/ai";
import ErrorBanner from "../components/ui/ErrorBanner";

// ── Content for the selected workspace ────────────────────────────────────────

function WorkspaceSummaries({ workspace }: { workspace: Workspace }) {
  const [docs, setDocs]             = useState<Document[]>([]);
  const [summaries, setSummaries]   = useState<Record<string, string>>({});
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setDocs([]);
    setSummaries({});
    setError("");

    (async () => {
      try {
        const all = await getDocuments(workspace.id);
        const ready = all.filter(d => d.status === "ready");
        if (cancelled) return;
        setDocs(ready);

        if (ready.length > 0) {
          const contents = await Promise.all(
            ready.map(d => getDocumentContent(workspace.id, d.id).catch(() => null))
          );
          if (cancelled) return;
          const map: Record<string, string> = {};
          contents.forEach((c, i) => { if (c?.summary) map[ready[i].id] = c.summary; });
          setSummaries(map);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load documents");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [workspace.id]);

  async function handleSummarize(doc: Document) {
    setGenerating(doc.id);
    setError("");
    try {
      const res = await aiSummarize(workspace.id, doc.id);
      setSummaries(prev => ({ ...prev, [doc.id]: res.summary }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Summarization failed. Check your API key.");
    } finally {
      setGenerating(null);
    }
  }

  if (loading) return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-white/[0.04] rounded-2xl animate-pulse" />)}
    </div>
  );

  if (error) return (
    <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>
  );

  if (docs.length === 0) return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-400/15 flex items-center justify-center">
        <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <p className="text-white font-bold text-lg">No ready documents</p>
      <p className="text-gray-500 text-sm">Upload and process files in this workspace to generate summaries.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {docs.map(doc => {
        const summary = summaries[doc.id];
        const busy = generating === doc.id;
        return (
          <div key={doc.id} className="rounded-xl border border-white/[0.07] overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.03]">
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
                  <><span className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin" />Generating…</>
                ) : summary ? <>↻ Re-summarize</> : <>✨ Summarize</>}
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
                <p className="text-xs text-gray-600 py-1">Click "Summarize" to generate an AI summary for this document.</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main section ───────────────────────────────────────────────────────────────

export default function SummarySection() {
  const [workspaces, setWorkspaces]     = useState<Workspace[]>([]);
  const [activeWsId, setActiveWsId]     = useState("");
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  useEffect(() => {
    getWorkspaces()
      .then(ws => {
        setWorkspaces(ws);
        if (ws.length > 0) setActiveWsId(ws[0].id);
        setLoading(false);
      })
      .catch(e => {
        setError(e instanceof Error ? e.message : "Failed to load workspaces");
        setLoading(false);
      });
  }, []);

  const activeWs = workspaces.find(w => w.id === activeWsId);

  return (
    <div className="flex flex-col gap-8 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Document Summaries</h1>
        <p className="text-sm mt-1 text-gray-500">
          {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""} · click a document to generate an AI summary
        </p>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-white/[0.04] rounded-2xl animate-pulse" />)}
        </div>
      ) : workspaces.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-32 text-center">
          <p className="text-white font-bold text-xl">No workspaces yet</p>
          <p className="text-gray-500 text-sm">Create a workspace and upload documents to generate summaries.</p>
        </div>
      ) : (
        <>
          {/* Scrollable workspace tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {workspaces.map(ws => (
              <button
                key={ws.id}
                onClick={() => setActiveWsId(ws.id)}
                className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                style={activeWsId === ws.id
                  ? { background: "rgba(6,182,212,0.15)", color: "#22d3ee", border: "1px solid rgba(6,182,212,0.3)" }
                  : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.08)" }
                }
              >
                {ws.title}
              </button>
            ))}
          </div>

          {/* Content for active workspace */}
          {activeWs && <WorkspaceSummaries key={activeWs.id} workspace={activeWs} />}
        </>
      )}
    </div>
  );
}
