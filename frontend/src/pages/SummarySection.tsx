import { useState, useEffect, useMemo } from "react";
import { getWorkspaces, type Workspace } from "../api/workspaces";
import { getDocuments, getDocumentContent } from "../api/documents";
import { aiSummarize } from "../api/ai";
import StatCard from "../components/dashboard/StatCard";
import SummaryCard, { type SummaryItem } from "../components/summary/SummaryCard";
import ErrorBanner from "../components/ui/ErrorBanner";
import SkeletonGrid from "../components/ui/SkeletonGrid";
import { useNavStore } from "../store/navStore";

const ALL_WORKSPACES = "all-workspaces";
type Filter = "all" | "summarized" | "missing";

function WorkspaceSummaries({
  workspaces,
  workspaceId,
  filter,
}: {
  workspaces: Workspace[];
  workspaceId: string;
  filter: Filter;
}) {
  const [docs, setDocs] = useState<SummaryItem[]>([]);
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState<string | null>(null);

  const isAllView = workspaceId === ALL_WORKSPACES;

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setDocs([]);
      setSummaries({});
      setError("");

      try {
        const sources = isAllView
          ? workspaces
          : workspaces.filter((workspace) => workspace.id === workspaceId);

        const grouped = await Promise.all(
          sources.map(async (workspace) => {
            const all = await getDocuments(workspace.id);
            const ready = all.filter((doc) => doc.status === "ready").map((doc) => ({ ...doc, workspaceTitle: workspace.title }));
            const contents = await Promise.all(
              ready.map((doc) => getDocumentContent(workspace.id, doc.id).catch(() => null)),
            );

            return {
              docs: ready,
              summaries: contents.reduce<Record<string, string>>((acc, content, index) => {
                if (content?.summary) acc[ready[index].id] = content.summary;
                return acc;
              }, {}),
            };
          }),
        );

        if (cancelled) return;

        setDocs(
          grouped
            .flatMap((group) => group.docs)
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
        );
        setSummaries(
          grouped.reduce<Record<string, string>>((acc, group) => ({ ...acc, ...group.summaries }), {}),
        );
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load documents");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [workspaceId, workspaces]);

  async function handleSummarize(doc: SummaryItem) {
    setGenerating(doc.id);
    setError("");
    try {
      const res = await aiSummarize(doc.workspace_id, doc.id);
      setSummaries((prev) => ({ ...prev, [doc.id]: res.summary }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Summarization failed. Check your API key.");
    } finally {
      setGenerating(null);
    }
  }

  const filteredDocs = useMemo(() => {
    if (filter === "all") return docs;
    if (filter === "summarized") return docs.filter((doc) => Boolean(summaries[doc.id]));
    return docs.filter((doc) => !summaries[doc.id]);
  }, [docs, filter, summaries]);

  const summarizedCount = docs.filter((doc) => Boolean(summaries[doc.id])).length;
  const missingCount = docs.length - summarizedCount;

  return (
    <div className="flex flex-col gap-6">
      {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}

      {!loading && docs.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[ 
            { label: "Ready Docs", value: docs.length, color: "text-cyan-400" },
            { label: "Summarized", value: summarizedCount, color: "text-emerald-400" },
            { label: "Missing", value: missingCount, color: "text-amber-400" },
          ].map((stat) => (
            <StatCard key={stat.label} label={stat.label} value={stat.value} accent={stat.color} />
          ))}
        </div>
      )}

      {loading ? (
        <SkeletonGrid cols={3} count={6} height="h-40" />
      ) : filteredDocs.length === 0 ? (
        <EmptyResults
          title={filter === "all" ? "No ready documents" : filter === "summarized" ? "No summarized documents" : "No missing summaries"}
          description="Upload and process files in a workspace to generate summaries here."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <SummaryCard
              key={doc.id}
              doc={doc}
              summary={summaries[doc.id]}
              busy={generating === doc.id}
              showWorkspace={isAllView}
              onSummarize={handleSummarize}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SummarySection() {
  const { navDirect } = useNavStore();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState(ALL_WORKSPACES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    getWorkspaces()
      .then((ws) => {
        setWorkspaces(ws);
        setWorkspaceId(ws.length > 0 ? ALL_WORKSPACES : "");
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load workspaces");
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex flex-col gap-8 pb-24">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Document Summaries</h1>
        <p className="text-sm mt-1 text-gray-500">
          {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""} · generate and review AI summaries for ready documents
        </p>
      </div>

      {workspaces.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setWorkspaceId(ALL_WORKSPACES)}
            className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
            style={workspaceId === ALL_WORKSPACES
              ? { background: "rgba(6,182,212,0.15)", color: "#22d3ee", border: "1px solid rgba(6,182,212,0.3)" }
              : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            All
          </button>
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              onClick={() => setWorkspaceId(workspace.id)}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              style={workspaceId === workspace.id
                ? { background: "rgba(6,182,212,0.15)", color: "#22d3ee", border: "1px solid rgba(6,182,212,0.3)" }
                : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.08)" }
              }
            >
              {workspace.title}
            </button>
          ))}
        </div>
      )}

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {workspaces.length === 0 && !loading ? (
        <WorkspaceEmptyState onGoToWorkspaces={() => navDirect({ view: "workspaces" })} />
      ) : workspaceId ? (
        <>
          <div className="flex gap-2 flex-wrap">
            {(["all", "summarized", "missing"] as Filter[]).map((value) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors capitalize ${
                  filter === value
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
                    : "text-gray-500 hover:text-white hover:bg-white/[0.05] border border-transparent"
                }`}
              >
                {value}
              </button>
            ))}
          </div>

          <WorkspaceSummaries
            key={`${workspaceId}-${workspaces.length}`}
            workspaces={workspaces}
            workspaceId={workspaceId}
            filter={filter}
          />
        </>
      ) : loading ? (
        <SkeletonGrid cols={3} count={3} height="h-40" />
      ) : null}
    </div>
  );
}

function EmptyResults({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center gap-6 py-24 text-center">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
        style={{ background: "rgba(6,182,212,0.10)", border: "1px solid rgba(6,182,212,0.22)" }}>
        <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <div className="space-y-1.5 max-w-sm">
        <p className="text-white font-bold text-xl">{title}</p>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>{description}</p>
      </div>
    </div>
  );
}

function WorkspaceEmptyState({ onGoToWorkspaces }: { onGoToWorkspaces: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 py-32 text-center">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
        style={{ background: "rgba(6,182,212,0.10)", border: "1px solid rgba(6,182,212,0.22)" }}>
        <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <div className="space-y-1.5 max-w-sm">
        <p className="text-white font-bold text-xl">No workspaces yet</p>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
          Create a workspace and upload documents to generate summaries.
        </p>
      </div>
      <button
        onClick={onGoToWorkspaces}
        className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white text-sm active:scale-95 transition-transform"
        style={{ background: "linear-gradient(135deg,#0891b2,#22d3ee)", boxShadow: "0 4px 20px rgba(6,182,212,0.35)" }}
      >
        Open a Workspace
      </button>
    </div>
  );
}
