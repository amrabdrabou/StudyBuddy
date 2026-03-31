import { useEffect, useState } from "react";
import { aiGenerateFlashcards, type Difficulty } from "../api/ai";
import { getDecks, type FlashcardDeck } from "../api/flashcards";
import type { GoalSourceMode } from "./useRoadmapGoalSource";

export function useFlashcardGenerator(workspaceId: string) {
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [configMode, setConfigMode] = useState<"auto" | "custom">("auto");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [deckTitle, setDeckTitle] = useState("AI Flashcards");
  const [count, setCount] = useState(15);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [studyDeck, setStudyDeck] = useState<FlashcardDeck | null>(null);

  const loadDecks = () => getDecks(workspaceId).then(setDecks).catch(() => {});

  useEffect(() => {
    loadDecks();
  }, [workspaceId]);

  const clearFeedback = () => {
    setError("");
    setSuccess("");
  };

  const generate = async ({ sourceMode, summaryText, goalSummary }: {
    sourceMode: GoalSourceMode;
    summaryText: string;
    goalSummary: string;
  }) => {
    if (sourceMode === "summary" && summaryText.trim().length < 50) {
      setError("Please paste a summary of at least 50 characters.");
      return;
    }

    if (sourceMode === "goals" && goalSummary.trim().length < 10) {
      setError("No roadmap goals found. Generate goals in the Road Map tab first.");
      return;
    }

    setGenerating(true);
    clearFeedback();
    try {
      const res = await aiGenerateFlashcards(workspaceId, {
        summary: sourceMode === "goals" ? goalSummary.trim() : summaryText.trim(),
        difficulty: configMode === "custom" ? difficulty : "normal",
        count: configMode === "custom" ? count : 15,
        deck_title: deckTitle.trim() || "AI Flashcards",
      });
      setSuccess(`Created "${res.deck_title}" with ${res.cards_created} cards.`);
      await loadDecks();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setGenerating(false);
    }
  };

  return {
    decks,
    configMode,
    setConfigMode,
    difficulty,
    setDifficulty,
    deckTitle,
    setDeckTitle,
    count,
    setCount,
    generating,
    error,
    success,
    studyDeck,
    setStudyDeck,
    clearFeedback,
    generate,
  };
}
