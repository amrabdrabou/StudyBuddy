import { useState } from "react";
import type { Flashcard } from "../../api/flashcards";

export default function FlipCard({ card, onMastered }: {
  card: Flashcard;
  onMastered: (id: string) => void;
}) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className="cursor-pointer" onClick={() => setFlipped(f => !f)} style={{ perspective: "1000px" }}>
      <div
        className="relative w-full h-40 transition-transform duration-500"
        style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        <div className="absolute inset-0 bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 flex flex-col justify-between"
          style={{ backfaceVisibility: "hidden" }}>
          <span className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">Front</span>
          <p className="text-white font-semibold text-sm leading-relaxed">{card.front_content}</p>
          <span className="text-[10px] text-gray-600">Click to flip</span>
        </div>
        <div className="absolute inset-0 bg-indigo-500/[0.08] border border-indigo-400/15 rounded-2xl p-5 flex flex-col justify-between"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
          <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold">Answer</span>
          <p className="text-white text-sm leading-relaxed">{card.back_content}</p>
          {!card.is_mastered && (
            <button onClick={e => { e.stopPropagation(); onMastered(card.id); }}
              className="text-[10px] text-emerald-400 font-bold hover:text-emerald-300 transition-colors self-start">
              ✓ Mark Mastered
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
