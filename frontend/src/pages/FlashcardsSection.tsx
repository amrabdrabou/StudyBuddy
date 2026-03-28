import { useState, useEffect, useRef } from "react";
import {
  getDecks, createDeck, deleteDeck,
  getCards,
  type FlashcardDeck,
} from "../api/flashcards";
import { getWorkspaces, type Workspace } from "../api/workspaces";
import Modal from "../components/ui/Modal";
import Field from "../components/ui/Field";
import ErrorBanner from "../components/ui/ErrorBanner";
import DeckCard from "../components/flashcards/DeckCard";
import DeckDetail from "../components/flashcards/DeckDetail";

// ── Shared inputs ─────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-xl bg-white/[0.08] border border-white/15 px-4 py-3 text-white " +
  "placeholder:text-gray-600 outline-none text-sm " +
  "focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition [&>option]:bg-slate-800";

// ── Main ──────────────────────────────────────────────────────────────────────

export default function FlashcardsSection() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [deckCardCounts, setDeckCardCounts] = useState<Record<string, { total: number; mastered: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDeck, setActiveDeck] = useState<FlashcardDeck | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const [deleteTarget, setDeleteTarget] = useState<FlashcardDeck | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadWorkspaces(); }, []);
  useEffect(() => { if (workspaceId) loadDecks(); }, [workspaceId]);
  useEffect(() => { if (showCreate) setTimeout(() => titleRef.current?.focus(), 50); }, [showCreate]);

  async function loadWorkspaces() {
    setLoading(true);
    try {
      const ws = await getWorkspaces();
      setWorkspaces(ws);
      if (ws.length > 0) setWorkspaceId(ws[0].id);
      else setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load workspaces");
      setLoading(false);
    }
  }

  async function loadDecks() {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const ds = await getDecks(workspaceId);
      setDecks(ds);
      // Load card counts for each deck
      const counts: Record<string, { total: number; mastered: number }> = {};
      await Promise.all(ds.map(async d => {
        try {
          const cards = await getCards(workspaceId, d.id);
          counts[d.id] = { total: cards.length, mastered: cards.filter(c => c.is_mastered).length };
        } catch { counts[d.id] = { total: 0, mastered: 0 }; }
      }));
      setDeckCardCounts(counts);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load decks"); }
    finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !workspaceId) return;
    setSaving(true); setFormErr(null);
    try {
      const d = await createDeck(workspaceId, { title: form.title.trim(), description: form.description.trim() || undefined });
      setDecks(prev => [d, ...prev]);
      setDeckCardCounts(prev => ({ ...prev, [d.id]: { total: 0, mastered: 0 } }));
      setShowCreate(false);
      setForm({ title: "", description: "" });
    } catch (e) { setFormErr(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget || !workspaceId) return;
    setDeleting(true);
    try {
      await deleteDeck(workspaceId, deleteTarget.id);
      setDecks(prev => prev.filter(d => d.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); setDeleteTarget(null); }
    finally { setDeleting(false); }
  }

  if (activeDeck && workspaceId) {
    return (
      <DeckDetail
        workspaceId={workspaceId}
        deck={activeDeck}
        onBack={() => setActiveDeck(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-24">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "#fcd34d" }}>
            Flashcard Decks &amp; Review
          </h1>
          <p className="text-sm mt-1" style={{ color: "#6b7280" }}>
            {decks.length} deck{decks.length !== 1 ? "s" : ""} · master your material one card at a time
          </p>
        </div>
        {workspaceId && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-105 active:scale-95 flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#7a42f4,#9d6bff)", boxShadow: "0 4px 20px rgba(122,66,244,0.3)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            New Deck
          </button>
        )}
      </div>

      {/* Scrollable workspace tabs */}
      {workspaces.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
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
        <div className="flex flex-col items-center gap-4 py-32 text-center">
          <p className="text-white font-bold text-xl">No workspaces yet</p>
          <p className="text-gray-500 text-sm">Create a workspace first to add flashcard decks.</p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-52 rounded-2xl animate-pulse" style={{ background: "#1a1d2e" }} />
          ))}
        </div>
      ) : decks.length === 0 ? (
        <div className="flex flex-col items-center gap-6 py-32 text-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(122,66,244,0.15)", border: "1px solid rgba(122,66,244,0.3)" }}>
            <svg className="w-10 h-10" style={{ color: "#a78bfa" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                d="M9.663 17h4.673M12 3a4 4 0 014 4c0 .732-.196 1.42-.54 2.013A4 4 0 0119 13c0 1.48-.8 2.773-1.993 3.482A4.002 4.002 0 0112 21a4.002 4.002 0 01-5.007-4.518A4 4 0 015 13a4 4 0 013.54-3.987A4 4 0 018 7a4 4 0 014-4z" />
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-xl">No flashcard decks yet</p>
            <p className="text-sm mt-1" style={{ color: "#6b7280" }}>Create a deck and start adding cards to study</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="px-6 py-3 rounded-2xl font-bold transition-colors text-white"
            style={{ background: "#7a42f4" }}>
            Create First Deck
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {decks.map((d, i) => (
            <DeckCard
              key={d.id} deck={d} index={i}
              cardCount={deckCardCounts[d.id]?.total ?? 0}
              masteredCount={deckCardCounts[d.id]?.mastered ?? 0}
              onOpen={setActiveDeck} onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}


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
