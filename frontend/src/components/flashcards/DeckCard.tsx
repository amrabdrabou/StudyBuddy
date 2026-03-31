import type { FlashcardDeck } from "../../api/flashcards";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui/card";

export const DECK_ICONS = [
  <svg key="brain" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"
      d="M9.663 17h4.673M12 3a4 4 0 014 4c0 .732-.196 1.42-.54 2.013A4 4 0 0119 13c0 1.48-.8 2.773-1.993 3.482A4.002 4.002 0 0112 21a4.002 4.002 0 01-5.007-4.518A4 4 0 015 13a4 4 0 013.54-3.987A4 4 0 018 7a4 4 0 014-4z" />
  </svg>,
  <svg key="code" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>,
  <svg key="book" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"
      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>,
];

export default function DeckCard({ deck, index, cardCount, masteredCount, workspaceTitle, onOpen, onDelete }: {
  deck: FlashcardDeck;
  index: number;
  cardCount: number;
  masteredCount: number;
  workspaceTitle?: string;
  onOpen: (d: FlashcardDeck) => void;
  onDelete: (d: FlashcardDeck) => void;
}) {
  const pct = cardCount > 0 ? Math.round((masteredCount / cardCount) * 100) : 0;
  const icon = DECK_ICONS[index % DECK_ICONS.length];

  return (
    <Card
      className="group relative flex flex-col gap-5 cursor-pointer transition-all duration-200
                 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(122,66,244,0.18)]"
      style={{ background: "#1a1d2e", border: "1px solid #2a2e45" }}
      onClick={() => onOpen(deck)}
    >
      <button onClick={e => { e.stopPropagation(); onDelete(deck); }}
        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
      <CardHeader className="flex-col items-start gap-4 p-6 pb-0">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(122,66,244,0.2)", color: "#a78bfa" }}>
          {icon}
        </div>
        <div>
          <CardTitle className="text-base">{deck.title}</CardTitle>
          <p className="text-sm mt-0.5" style={{ color: "#6b7280" }}>{cardCount} Cards</p>
          {workspaceTitle && (
            <p className="text-[10px] mt-1 uppercase tracking-wide font-bold" style={{ color: "#9ca3af" }}>
              {workspaceTitle}
            </p>
          )}
          {deck.description && <p className="text-xs mt-1 line-clamp-1" style={{ color: "#6b7280" }}>{deck.description}</p>}
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-6 pt-0">
        <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-xs">
          <span style={{ color: "#9ca3af" }}>Progress</span>
          <span style={{ color: "#a78bfa" }} className="font-bold">{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#2a2e45" }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: "linear-gradient(90deg,#7a42f4,#a78bfa)" }} />
        </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
      <button onClick={e => { e.stopPropagation(); onOpen(deck); }}
        className="w-full py-2.5 rounded-xl text-sm font-bold transition-all duration-200 mt-auto hover:opacity-90 active:scale-95"
        style={{ background: "rgba(122,66,244,0.25)", color: "#c4b5fd", border: "1px solid rgba(122,66,244,0.4)" }}>
        Review Now
      </button>
      </CardFooter>
    </Card>
  );
}
