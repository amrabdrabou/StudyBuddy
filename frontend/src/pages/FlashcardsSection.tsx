import { useState, useEffect, useRef } from "react";
import {
  getDecks, createDeck, updateDeck, deleteDeck,
  getCards, createCard, deleteCard, updateCard,
  type FlashcardDeck, type Flashcard,
} from "../api/flashcards";
import type { Subject } from "../api/subjects";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Shared inputs ─────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-400">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl bg-white/[0.08] border border-white/15 px-4 py-3 text-white " +
  "placeholder:text-gray-600 outline-none text-sm " +
  "focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition [&>option]:bg-slate-800";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Flip Card (review mode) ───────────────────────────────────────────────────

function FlipCard({ card, onMastered }: { card: Flashcard; onMastered: (id: string) => void }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className="perspective-1000 cursor-pointer" onClick={() => setFlipped(f => !f)} style={{ perspective: "1000px" }}>
      <div
        className="relative w-full h-40 transition-transform duration-500"
        style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* Front */}
        <div className="absolute inset-0 bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 flex flex-col justify-between backface-hidden"
          style={{ backfaceVisibility: "hidden" }}>
          <span className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">Front</span>
          <p className="text-white font-semibold text-sm leading-relaxed">{card.front_content}</p>
          <span className="text-[10px] text-gray-600">Click to flip</span>
        </div>
        {/* Back */}
        <div className="absolute inset-0 bg-indigo-500/[0.08] border border-indigo-400/15 rounded-2xl p-5 flex flex-col justify-between"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
          <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold">Answer</span>
          <p className="text-white text-sm leading-relaxed">{card.back_content}</p>
          {!card.is_mastered && (
            <button
              onClick={e => { e.stopPropagation(); onMastered(card.id); }}
              className="text-[10px] text-emerald-400 font-bold hover:text-emerald-300 transition-colors self-start">
              ✓ Mark Mastered
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Deck icon cycling ─────────────────────────────────────────────────────────

const DECK_ICONS = [
  // Brain
  <svg key="brain" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"
      d="M9.663 17h4.673M12 3a4 4 0 014 4c0 .732-.196 1.42-.54 2.013A4 4 0 0119 13c0 1.48-.8 2.773-1.993 3.482A4.002 4.002 0 0112 21a4.002 4.002 0 01-5.007-4.518A4 4 0 015 13a4 4 0 013.54-3.987A4 4 0 018 7a4 4 0 014-4z" />
  </svg>,
  // Code
  <svg key="code" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>,
  // Globe
  <svg key="globe" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"
      d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 004 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>,
  // Book
  <svg key="book" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"
      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>,
  // Flask
  <svg key="flask" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"
      d="M9 3h6m-6 0v6l-3 9a1 1 0 001 1h10a1 1 0 001-1l-3-9V3M9 3H6m9 0h3" />
  </svg>,
];

// ── Deck Card ─────────────────────────────────────────────────────────────────

function DeckCard({ deck, index, onOpen, onDelete }: {
  deck: FlashcardDeck;
  index: number;
  onOpen: (d: FlashcardDeck) => void;
  onDelete: (d: FlashcardDeck) => void;
}) {
  const pct = deck.total_flashcards > 0
    ? Math.round((deck.mastered_flashcards / deck.total_flashcards) * 100)
    : 0;
  const icon = DECK_ICONS[index % DECK_ICONS.length];

  return (
    <div
      className="group relative flex flex-col gap-5 rounded-2xl p-6 cursor-pointer transition-all duration-200
                 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(122,66,244,0.18)]"
      style={{ background: "#1a1d2e", border: "1px solid #2a2e45" }}
      onClick={() => onOpen(deck)}
    >
      {/* Delete button */}
      <button
        onClick={e => { e.stopPropagation(); onDelete(deck); }}
        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>

      {/* Icon */}
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(122,66,244,0.2)", color: "#a78bfa" }}>
        {icon}
      </div>

      {/* Title + count */}
      <div>
        <p className="text-white font-semibold text-base leading-tight">{deck.title}</p>
        <p className="text-sm mt-0.5" style={{ color: "#6b7280" }}>{deck.total_flashcards} Cards</p>
        {deck.description && <p className="text-xs mt-1 line-clamp-1" style={{ color: "#6b7280" }}>{deck.description}</p>}
      </div>

      {/* Progress bar */}
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

      {/* Review Now button */}
      <button
        onClick={e => { e.stopPropagation(); onOpen(deck); }}
        className="w-full py-2.5 rounded-xl text-sm font-bold transition-all duration-200 mt-auto
                   hover:opacity-90 active:scale-95"
        style={{ background: "rgba(122,66,244,0.25)", color: "#c4b5fd", border: "1px solid rgba(122,66,244,0.4)" }}
      >
        Review Now
      </button>
    </div>
  );
}

// ── Deck Detail View ──────────────────────────────────────────────────────────

function DeckDetail({ deck, onBack, onDeckUpdate }: {
  deck: FlashcardDeck;
  onBack: () => void;
  onDeckUpdate: (d: FlashcardDeck) => void;
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
    try { setCards(await getCards(deck.id)); }
    finally { setLoading(false); }
  }

  async function handleAddCard(e: React.FormEvent) {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    setSaving(true);
    try {
      const c = await createCard({ deck_id: deck.id, front_content: front.trim(), back_content: back.trim(), hint: hint.trim() || undefined });
      setCards(prev => [...prev, c]);
      setFront(""); setBack(""); setHint(""); setShowAdd(false);
      onDeckUpdate({ ...deck, total_flashcards: deck.total_flashcards + 1 });
    } finally { setSaving(false); }
  }

  async function handleDeleteCard(id: string) {
    await deleteCard(id);
    setCards(prev => prev.filter(c => c.id !== id));
    onDeckUpdate({ ...deck, total_flashcards: Math.max(0, deck.total_flashcards - 1) });
  }

  async function handleMastered(id: string) {
    const c = await updateCard(id, { is_mastered: true });
    setCards(prev => prev.map(x => x.id === c.id ? c : x));
    onDeckUpdate({ ...deck, mastered_flashcards: deck.mastered_flashcards + 1 });
  }

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
          <p className="text-gray-500 text-sm">{deck.total_flashcards} cards • {deck.mastered_flashcards} mastered</p>
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
                  {c.next_review_date && !c.is_mastered && <span className="text-[10px] bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full font-bold">Due</span>}
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

// ── Main ──────────────────────────────────────────────────────────────────────

interface Props { subjects: Subject[]; subjectFilter?: string }

export default function FlashcardsSection({ subjects, subjectFilter = "" }: Props) {
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDeck, setActiveDeck] = useState<FlashcardDeck | null>(null);

  // Create
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", study_subject_id: "" });
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<FlashcardDeck | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { load(); }, []);
  useEffect(() => { if (showCreate) setTimeout(() => titleRef.current?.focus(), 50); }, [showCreate]);

  async function load() {
    setLoading(true);
    try { setDecks(await getDecks()); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to load decks"); }
    finally { setLoading(false); }
  }

  const visibleDecks = subjectFilter ? decks.filter(d => d.study_subject_id === subjectFilter) : decks;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true); setFormErr(null);
    try {
      const d = await createDeck({ title: form.title.trim(), description: form.description.trim() || undefined, study_subject_id: form.study_subject_id || null });
      setDecks(prev => [d, ...prev]);
      setShowCreate(false);
      setForm({ title: "", description: "", study_subject_id: "" });
    } catch (e) { setFormErr(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDeck(deleteTarget.id);
      setDecks(prev => prev.filter(d => d.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); setDeleteTarget(null); }
    finally { setDeleting(false); }
  }

  if (activeDeck) {
    return (
      <DeckDetail
        deck={activeDeck}
        onBack={() => setActiveDeck(null)}
        onDeckUpdate={updated => {
          setDecks(prev => prev.map(d => d.id === updated.id ? updated : d));
          setActiveDeck(updated);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-24">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "#fcd34d" }}>
          Flashcard Decks &amp; Review
        </h1>
        <p className="text-sm mt-1" style={{ color: "#6b7280" }}>
          {visibleDecks.length} deck{visibleDecks.length !== 1 ? "s" : ""} · master your material one card at a time
        </p>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-500/10 border border-red-400/20 px-5 py-4 text-sm text-red-300 flex items-center justify-between">
          {error}<button onClick={() => setError(null)} className="text-red-400 hover:text-red-200 ml-4">✕</button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-52 rounded-2xl animate-pulse" style={{ background: "#1a1d2e" }} />
          ))}
        </div>
      ) : visibleDecks.length === 0 ? (
        <div className="flex flex-col items-center gap-6 py-32 text-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(122,66,244,0.15)", border: "1px solid rgba(122,66,244,0.3)" }}>
            <svg className="w-10 h-10" style={{ color: "#a78bfa" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                d="M9.663 17h4.673M12 3a4 4 0 014 4c0 .732-.196 1.42-.54 2.013A4 4 0 0119 13c0 1.48-.8 2.773-1.993 3.482A4.002 4.002 0 0112 21a4.002 4.002 0 01-5.007-4.518A4 4 0 015 13a4 4 0 013.54-3.987A4 4 0 018 7a4 4 0 014-4z" />
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-xl">{subjectFilter ? "No decks for this subject" : "No flashcard decks yet"}</p>
            <p className="text-sm mt-1" style={{ color: "#6b7280" }}>{subjectFilter ? "Create a deck and assign it to this subject" : "Create a deck and start adding cards to study"}</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="px-6 py-3 rounded-2xl font-bold transition-colors text-white"
            style={{ background: "#7a42f4" }}>
            Create First Deck
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleDecks.map((d, i) => (
            <DeckCard key={d.id} deck={d} index={i} onOpen={setActiveDeck} onDelete={setDeleteTarget} />
          ))}
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setShowCreate(true)}
        className="fixed bottom-8 right-8 z-50 flex items-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-white shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95"
        style={{ background: "linear-gradient(135deg,#7a42f4,#9d6bff)", boxShadow: "0 8px 32px rgba(122,66,244,0.45)" }}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
        </svg>
        Create New Deck
      </button>

      {showCreate && (
        <Modal title="New Flashcard Deck" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            {formErr && <p className="text-red-400 text-sm">{formErr}</p>}
            <Field label="Deck Title *">
              <input ref={titleRef} className={inputCls} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. JavaScript Fundamentals" required />
            </Field>
            <Field label="Description">
              <textarea className={inputCls + " resize-none"} rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What is this deck about?" />
            </Field>
            <Field label="Subject">
              <select className={inputCls} value={form.study_subject_id} onChange={e => setForm(p => ({ ...p, study_subject_id: e.target.value }))}>
                <option value="">— None —</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <div className="flex gap-3 mt-2">
              <button type="button" onClick={() => setShowCreate(false)}
                className="flex-1 py-3 rounded-xl border border-white/15 text-gray-400 hover:text-white font-semibold text-sm transition-colors">Cancel</button>
              <button type="submit" disabled={saving}
                className="flex-1 py-3 rounded-xl text-white font-bold text-sm transition-colors disabled:opacity-50"
                style={{ background: "#7a42f4" }}>
                {saving ? "Creating…" : "Create Deck"}
              </button>
            </div>
          </form>
        </Modal>
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
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
