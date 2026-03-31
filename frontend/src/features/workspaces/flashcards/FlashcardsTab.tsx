import { useEffect, useState } from "react";

import { deleteDeck, getCards, getDecks, type FlashcardDeck } from "../../../api/flashcards";
import DeckCard from "../../../components/flashcards/DeckCard";
import ErrorBanner from "../../../components/ui/ErrorBanner";
import SkeletonGrid from "../../../components/ui/SkeletonGrid";
import { useWorkspaceDetailContext } from "../context/WorkspaceDetailContext";

export default function WorkspaceFlashcardsTab({
  renderStudyModal,
}: {
  renderStudyModal: (deck: FlashcardDeck | null, onClose: () => void) => React.ReactNode;
}) {
  const { workspaceId, workspaceTitle } = useWorkspaceDetailContext();
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [deckCardCounts, setDeckCardCounts] = useState<Record<string, { total: number; mastered: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDeck, setActiveDeck] = useState<FlashcardDeck | null>(null);

  useEffect(() => {
    void loadDecks();
  }, [workspaceId]);

  async function loadDecks() {
    setLoading(true);
    setError(null);
    try {
      const items = await getDecks(workspaceId);
      setDecks(items);

      const counts: Record<string, { total: number; mastered: number }> = {};
      await Promise.all(
        items.map(async (deck) => {
          try {
            const cards = await getCards(workspaceId, deck.id);
            counts[deck.id] = {
              total: cards.length,
              mastered: cards.filter((card) => card.is_mastered).length,
            };
          } catch {
            counts[deck.id] = { total: 0, mastered: 0 };
          }
        }),
      );
      setDeckCardCounts(counts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load flashcard decks");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(deck: FlashcardDeck) {
    try {
      await deleteDeck(workspaceId, deck.id);
      setDecks((prev) => prev.filter((item) => item.id !== deck.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete deck");
    }
  }

  return (
    <div className="space-y-6">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {loading ? (
        <SkeletonGrid cols={3} count={6} height="h-52" />
      ) : decks.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <p className="text-white font-bold text-xl">No flashcard decks yet</p>
          <p className="text-gray-500 text-sm">
            Generate a flashcard deck from <span className="text-gray-400">{workspaceTitle}</span> to study here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {decks.map((deck, index) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              index={index}
              workspaceTitle={workspaceTitle}
              cardCount={deckCardCounts[deck.id]?.total ?? 0}
              masteredCount={deckCardCounts[deck.id]?.mastered ?? 0}
              onOpen={setActiveDeck}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {activeDeck && renderStudyModal(activeDeck, () => setActiveDeck(null))}
    </div>
  );
}
