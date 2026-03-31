import { useState, useEffect } from "react";
import { getDecks, deleteDeck, getCards, type FlashcardDeck } from "../api/flashcards";
import { getWorkspaces, type Workspace } from "../api/workspaces";
import Modal from "../components/ui/Modal";
import ErrorBanner from "../components/ui/ErrorBanner";
import PageEmptyState from "../components/ui/PageEmptyState";
import DeckCard from "../components/flashcards/DeckCard";
import DeckDetail from "../components/flashcards/DeckDetail";
import { useNavStore } from "../store/navStore";

const ALL_WORKSPACES = "all-workspaces";
type DeckListItem = FlashcardDeck & { workspaceTitle: string };

export default function FlashcardsSection() {
  const { navDirect } = useNavStore();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState(ALL_WORKSPACES);
  const [decks, setDecks] = useState<DeckListItem[]>([]);
  const [deckCardCounts, setDeckCardCounts] = useState<Record<string, { total: number; mastered: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDeck, setActiveDeck] = useState<{ deck: FlashcardDeck; workspaceId: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeckListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadWorkspaces(); }, []);
  useEffect(() => { if (workspaceId) loadDecks(); }, [workspaceId, workspaces]);

  async function loadWorkspaces() {
    setLoading(true);
    try {
      const ws = await getWorkspaces();
      setWorkspaces(ws);
      setWorkspaceId(ws.length > 0 ? ALL_WORKSPACES : "");
      if (ws.length === 0) setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load workspaces");
      setLoading(false);
    }
  }

  async function loadDecks() {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const counts: Record<string, { total: number; mastered: number }> = {};

      if (workspaceId === ALL_WORKSPACES) {
        const grouped = await Promise.all(
          workspaces.map(async (workspace) => {
            const items = await getDecks(workspace.id);
            const decorated = items.map((deck) => ({ ...deck, workspaceTitle: workspace.title }));
            await Promise.all(
              decorated.map(async (deck) => {
                try {
                  const cards = await getCards(workspace.id, deck.id);
                  counts[deck.id] = { total: cards.length, mastered: cards.filter((card) => card.is_mastered).length };
                } catch {
                  counts[deck.id] = { total: 0, mastered: 0 };
                }
              }),
            );
            return decorated;
          }),
        );

        setDecks(
          grouped.flat().sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
        );
      } else {
        const currentWorkspace = workspaces.find((workspace) => workspace.id === workspaceId);
        if (!currentWorkspace) {
          setDecks([]);
        } else {
          const ds = await getDecks(workspaceId);
          const decorated = ds.map((deck) => ({ ...deck, workspaceTitle: currentWorkspace.title }));
          await Promise.all(decorated.map(async (deck) => {
            try {
              const cards = await getCards(workspaceId, deck.id);
              counts[deck.id] = { total: cards.length, mastered: cards.filter((card) => card.is_mastered).length };
            } catch {
              counts[deck.id] = { total: 0, mastered: 0 };
            }
          }));
          setDecks(decorated);
        }
      }

      setDeckCardCounts(counts);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load decks"); }
    finally { setLoading(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDeck(deleteTarget.workspace_id, deleteTarget.id);
      setDecks(prev => prev.filter(d => d.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); setDeleteTarget(null); }
    finally { setDeleting(false); }
  }

  if (activeDeck) {
    return <DeckDetail workspaceId={activeDeck.workspaceId} deck={activeDeck.deck} onBack={() => setActiveDeck(null)} />;
  }

  return (
    <div className="flex flex-col gap-8 pb-24">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "#fcd34d" }}>
          Flashcard Decks &amp; Review
        </h1>
        <p className="text-sm mt-1" style={{ color: "#6b7280" }}>
          {decks.length} deck{decks.length !== 1 ? "s" : ""} · master your material one card at a time
        </p>
      </div>

      {workspaces.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setWorkspaceId(ALL_WORKSPACES)}
            className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
            style={workspaceId === ALL_WORKSPACES
              ? { background: "rgba(251,191,36,0.15)", color: "#fcd34d", border: "1px solid rgba(251,191,36,0.3)" }
              : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            All
          </button>
          {workspaces.map(ws => (
            <button
              key={ws.id}
              onClick={() => setWorkspaceId(ws.id)}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              style={workspaceId === ws.id
                ? { background: "rgba(251,191,36,0.15)", color: "#fcd34d", border: "1px solid rgba(251,191,36,0.3)" }
                : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.08)" }
              }
            >
              {ws.title}
            </button>
          ))}
        </div>
      )}

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {workspaces.length === 0 && !loading ? (
        <PageEmptyState
          title="No workspaces yet"
          description="Create a workspace first, then use AI to generate flashcard decks from your documents."
          actionLabel="Open a Workspace"
          onAction={() => navDirect({ view: "workspaces" })}
          icon={
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold"
              style={{ background: "rgba(122,66,244,0.12)", border: "1px solid rgba(122,66,244,0.25)", color: "#c4b5fd" }}
            >
              Deck
            </div>
          }
        />
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-52 rounded-2xl animate-pulse" style={{ background: "#1a1d2e" }} />
          ))}
        </div>
      ) : decks.length === 0 ? (
        <PageEmptyState
          title="No flashcard decks yet"
          description="Open a workspace, upload documents, and let AI generate decks for you."
          actionLabel="Open a Workspace"
          onAction={() => navDirect({ view: "workspaces" })}
          icon={
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold"
              style={{ background: "rgba(122,66,244,0.12)", border: "1px solid rgba(122,66,244,0.25)", color: "#c4b5fd" }}
            >
              Cards
            </div>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {decks.map((deck, i) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              index={i}
              workspaceTitle={workspaceId === ALL_WORKSPACES ? deck.workspaceTitle : undefined}
              cardCount={deckCardCounts[deck.id]?.total ?? 0}
              masteredCount={deckCardCounts[deck.id]?.mastered ?? 0}
              onOpen={(selectedDeck) => setActiveDeck({ deck: selectedDeck, workspaceId: deck.workspace_id })}
              onDelete={() => setDeleteTarget(deck)}
            />
          ))}
        </div>
      )}

      {deleteTarget && (
        <Modal title="Delete Deck" onClose={() => setDeleteTarget(null)}>
          <p className="text-gray-400 text-sm mb-6">
            Delete <span className="text-white font-semibold">"{deleteTarget.title}"</span> and all its cards? This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteTarget(null)}
              className="flex-1 py-3 rounded-xl border border-white/15 text-gray-400 hover:text-white font-semibold text-sm transition-colors">Cancel</button>
            <button onClick={handleDelete} disabled={deleting}
              className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors disabled:opacity-50">
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
