import { useState, useEffect } from "react";
import {
  getCards, createCard, deleteCard, updateCard,
  type FlashcardDeck, type Flashcard,
} from "../../api/flashcards";
import FlipCard from "./FlipCard";
import Modal from "../ui/Modal";
import Field from "../ui/Field";

const inputCls =
  "w-full rounded-xl bg-white/[0.08] border border-white/15 px-4 py-3 text-white " +
  "placeholder:text-gray-600 outline-none text-sm " +
  "focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition [&>option]:bg-slate-800";

export default function DeckDetail({ workspaceId, deck, onBack }: {
  workspaceId: string;
  deck: FlashcardDeck;
  onBack: () => void;
}) {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [hint, setHint] = useState("");
  const [saving, setSaving] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewIdx, setReviewIdx] = useState(0);

  useEffect(() => { loadCards(); }, [deck.id]);

  async function loadCards() {
    setLoading(true);
    try { setCards(await getCards(workspaceId, deck.id)); }
    finally { setLoading(false); }
  }

  async function handleAddCard(e: React.FormEvent) {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    setSaving(true);
    try {
      const c = await createCard(workspaceId, deck.id, { front_content: front.trim(), back_content: back.trim(), hint: hint.trim() || undefined });
      setCards(prev => [...prev, c]);
      setFront(""); setBack(""); setHint(""); setShowAdd(false);
    } finally { setSaving(false); }
  }

  async function handleDeleteCard(id: string) {
    await deleteCard(workspaceId, deck.id, id);
    setCards(prev => prev.filter(c => c.id !== id));
  }

  async function handleMastered(id: string) {
    const c = await updateCard(workspaceId, deck.id, id, { is_mastered: true });
    setCards(prev => prev.map(x => x.id === c.id ? c : x));
  }

  const masteredCount = cards.filter(c => c.is_mastered).length;

  if (reviewMode && cards.length > 0) {
    const card = cards[reviewIdx % cards.length];
    return (
      <div className="flex flex-col gap-6 max-w-lg mx-auto py-8">
        <div className="flex items-center justify-between">
          <button onClick={() => setReviewMode(false)} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            Exit Review
          </button>
          <span className="text-gray-500 text-sm">{(reviewIdx % cards.length) + 1} / {cards.length}</span>
        </div>
        <FlipCard card={card} onMastered={handleMastered} />
        <div className="flex gap-3">
          <button onClick={() => setReviewIdx(i => Math.max(0, i - 1))}
            className="flex-1 py-3 rounded-xl border border-white/15 text-gray-400 hover:text-white transition-colors font-semibold text-sm">← Prev</button>
          <button onClick={() => setReviewIdx(i => i + 1)}
            className="flex-1 py-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/20 transition-colors font-bold text-sm">Next →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          All Decks
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">{deck.title}</h1>
          <p className="text-gray-500 text-sm">{cards.length} cards • {masteredCount} mastered</p>
        </div>
        {cards.length > 0 && (
          <button onClick={() => { setReviewMode(true); setReviewIdx(0); }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            </svg>
            Review Cards
          </button>
        )}
        <button onClick={() => setShowAdd(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
          Add Card
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-white/[0.04] rounded-2xl animate-pulse" />)}
        </div>
      ) : cards.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <p className="text-white font-bold">No cards yet</p>
          <p className="text-gray-500 text-sm">Add your first flashcard to this deck</p>
          <button onClick={() => setShowAdd(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-bold transition-colors">
            Add First Card
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(c => (
            <div key={c.id} className="group bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 flex flex-col gap-3 hover:border-indigo-400/20 transition-all">
              <div className="flex items-start justify-between gap-2">
                <div className="flex gap-2">
                  {c.is_mastered && <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-bold">Mastered</span>}
                  {c.next_review_at && !c.is_mastered && <span className="text-[10px] bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full font-bold">Due</span>}
                </div>
                <button onClick={() => handleDeleteCard(c.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-600 hover:text-red-400 transition-all">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Front</p>
                <p className="text-white text-sm font-medium line-clamp-2">{c.front_content}</p>
              </div>
              <div className="border-t border-white/[0.06] pt-3">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Back</p>
                <p className="text-gray-300 text-sm line-clamp-2">{c.back_content}</p>
              </div>
              {c.hint && <p className="text-xs text-indigo-400/70 italic">Hint: {c.hint}</p>}
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title="Add Flashcard" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAddCard} className="flex flex-col gap-4">
            <Field label="Front (Question) *">
              <textarea className={inputCls + " resize-none"} rows={3} value={front} onChange={e => setFront(e.target.value)} placeholder="Enter the question or term" required />
            </Field>
            <Field label="Back (Answer) *">
              <textarea className={inputCls + " resize-none"} rows={3} value={back} onChange={e => setBack(e.target.value)} placeholder="Enter the answer or definition" required />
            </Field>
            <Field label="Hint (optional)">
              <input className={inputCls} value={hint} onChange={e => setHint(e.target.value)} placeholder="A helpful hint" />
            </Field>
            <div className="flex gap-3 mt-2">
              <button type="button" onClick={() => setShowAdd(false)}
                className="flex-1 py-3 rounded-xl border border-white/15 text-gray-400 hover:text-white font-semibold text-sm transition-colors">Cancel</button>
              <button type="submit" disabled={saving}
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors disabled:opacity-50">
                {saving ? "Adding…" : "Add Card"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
