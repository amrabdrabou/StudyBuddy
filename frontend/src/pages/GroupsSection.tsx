import { useState, useEffect, useRef } from "react";
import {
  getGroups, createGroup, deleteGroup, generateInviteCode, joinGroup, leaveGroup,
  type StudyGroup,
} from "../api/groups";

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
      <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl">
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

// ── Group Detail ──────────────────────────────────────────────────────────────

function GroupDetail({ group, currentUserId, onBack, onGroupUpdate, onLeave }: {
  group: StudyGroup;
  currentUserId: string;
  onBack: () => void;
  onGroupUpdate: (g: StudyGroup) => void;
  onLeave: (id: string) => void;
}) {
  const isOwner = group.creator_id === currentUserId;
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleGenerateCode() {
    setGenerating(true);
    try {
      const g = await generateInviteCode(group.id);
      onGroupUpdate(g);
    } finally { setGenerating(false); }
  }

  function copyCode() {
    if (group.invite_code) {
      navigator.clipboard.writeText(group.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          All Groups
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">{group.name}</h1>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${group.is_private ? "bg-pink-500/15 text-pink-400" : "bg-blue-500/15 text-blue-400"}`}>
              {group.is_private ? "Private" : "Public"}
            </span>
          </div>
          <p className="text-gray-500 text-sm">{group.members.length} member{group.members.length !== 1 ? "s" : ""} • Created {fmtDate(group.created_at)}</p>
        </div>
        {!isOwner && (
          <button onClick={() => onLeave(group.id)}
            className="px-4 py-2 rounded-xl text-sm font-bold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors">
            Leave Group
          </button>
        )}
      </div>

      {/* Invite code */}
      {isOwner && (
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5">
          <p className="text-sm font-semibold text-white mb-3">Invite Code</p>
          {group.invite_code ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 font-mono text-white font-bold tracking-widest text-lg">
                {group.invite_code}
              </div>
              <button onClick={copyCode}
                className={`px-4 py-3 rounded-xl text-sm font-bold transition-all border ${copied ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-400" : "bg-white/[0.06] border-white/15 text-gray-300 hover:text-white"}`}>
                {copied ? "Copied!" : "Copy"}
              </button>
              <button onClick={handleGenerateCode} disabled={generating}
                className="px-4 py-3 rounded-xl text-sm font-bold bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/30 transition-colors disabled:opacity-50">
                {generating ? "…" : "Regenerate"}
              </button>
            </div>
          ) : (
            <button onClick={handleGenerateCode} disabled={generating}
              className="py-3 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors disabled:opacity-50">
              {generating ? "Generating…" : "Generate Invite Code"}
            </button>
          )}
          <p className="text-xs text-gray-600 mt-2">Share this code so others can join the group.</p>
        </div>
      )}

      {/* Members list */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 flex flex-col gap-4">
        <p className="text-sm font-semibold text-white">Members ({group.members.length})</p>
        <div className="space-y-2">
          {group.members.map(m => (
            <div key={m.user_id} className="flex items-center gap-3 py-2">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0
                ${m.role === "owner" ? "bg-pink-500/15 text-pink-400 border border-pink-400/20" : "bg-blue-500/15 text-blue-400 border border-blue-400/20"}`}>
                {m.user_id.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">Member</p>
                <p className="text-gray-500 text-xs">Joined {fmtDate(m.joined_at)}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.role === "owner" ? "bg-pink-500/15 text-pink-400" : "bg-blue-500/15 text-blue-400"}`}>
                {m.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Group Card ────────────────────────────────────────────────────────────────

function GroupCard({ group, currentUserId, onOpen, onDelete }: {
  group: StudyGroup;
  currentUserId: string;
  onOpen: (g: StudyGroup) => void;
  onDelete: (g: StudyGroup) => void;
}) {
  const isOwner = group.creator_id === currentUserId;
  return (
    <div
      className="group bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 flex flex-col gap-4
                 hover:bg-white/[0.06] hover:border-pink-500/20 transition-all duration-200 cursor-pointer"
      onClick={() => onOpen(group)}>
      <div className="flex items-start justify-between gap-2">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black flex-shrink-0
          ${group.is_private ? "bg-pink-500/15 text-pink-400 border border-pink-400/20" : "bg-blue-500/15 text-blue-400 border border-blue-400/20"}`}>
          {group.name.charAt(0).toUpperCase()}
        </div>
        {isOwner && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(group); }}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <p className="text-white font-semibold">{group.name}</p>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${group.is_private ? "bg-pink-500/15 text-pink-400" : "bg-blue-500/15 text-blue-400"}`}>
            {group.is_private ? "Private" : "Public"}
          </span>
        </div>
        {isOwner && <span className="text-[10px] bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full font-bold">Owner</span>}
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-500 mt-auto pt-3 border-t border-white/[0.05]">
        <span className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {group.members.length}{group.max_members ? `/${group.max_members}` : ""} members
        </span>
        <span className="ml-auto text-xs">{fmtDate(group.created_at)}</span>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface Props { currentUserId: string }

export default function GroupsSection({ currentUserId }: Props) {
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<StudyGroup | null>(null);

  // Create
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", is_private: true, max_members: "" });
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // Join
  const [showJoin, setShowJoin] = useState(false);
  const [joinGroupId, setJoinGroupId] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinErr, setJoinErr] = useState<string | null>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<StudyGroup | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { load(); }, []);
  useEffect(() => { if (showCreate) setTimeout(() => nameRef.current?.focus(), 50); }, [showCreate]);

  async function load() {
    setLoading(true);
    try { setGroups(await getGroups()); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to load groups"); }
    finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true); setFormErr(null);
    try {
      const g = await createGroup({
        name: form.name.trim(),
        is_private: form.is_private,
        max_members: form.max_members ? Number(form.max_members) : null,
      });
      setGroups(prev => [g, ...prev]);
      setShowCreate(false);
      setForm({ name: "", is_private: true, max_members: "" });
    } catch (e) { setFormErr(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinGroupId.trim() || !joinCode.trim()) return;
    setJoining(true); setJoinErr(null);
    try {
      await joinGroup(joinGroupId.trim(), joinCode.trim());
      await load();
      setShowJoin(false); setJoinGroupId(""); setJoinCode("");
    } catch (e) { setJoinErr(e instanceof Error ? e.message : "Failed"); }
    finally { setJoining(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteGroup(deleteTarget.id);
      setGroups(prev => prev.filter(g => g.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); setDeleteTarget(null); }
    finally { setDeleting(false); }
  }

  async function handleLeave(groupId: string) {
    try {
      await leaveGroup(groupId, currentUserId);
      setGroups(prev => prev.filter(g => g.id !== groupId));
      setActiveGroup(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to leave group"); }
  }

  if (activeGroup) {
    return (
      <GroupDetail
        group={activeGroup}
        currentUserId={currentUserId}
        onBack={() => setActiveGroup(null)}
        onGroupUpdate={updated => {
          setGroups(prev => prev.map(g => g.id === updated.id ? updated : g));
          setActiveGroup(updated);
        }}
        onLeave={handleLeave}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Study Groups</h1>
          <p className="text-gray-500 text-sm mt-1">{groups.length} group{groups.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowJoin(true)}
            className="border border-white/15 text-gray-300 hover:text-white hover:border-white/30 px-4 py-2 rounded-xl text-sm font-bold transition-colors">
            Join with Code
          </button>
          <button onClick={() => setShowCreate(true)}
            className="bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
            New Group
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-500/10 border border-red-400/20 px-5 py-4 text-sm text-red-300 flex items-center justify-between">
          {error}<button onClick={() => setError(null)} className="text-red-400 hover:text-red-200 ml-4">✕</button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-44 bg-white/[0.04] rounded-2xl animate-pulse" />)}
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center gap-6 py-32 text-center">
          <div className="w-20 h-20 rounded-2xl bg-pink-500/10 border border-pink-400/15 flex items-center justify-center">
            <svg className="w-10 h-10 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-xl">No study groups yet</p>
            <p className="text-gray-500 text-sm mt-1">Create a group or join one with an invite code</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowJoin(true)}
              className="border border-white/15 text-gray-300 hover:text-white px-6 py-3 rounded-2xl font-bold transition-colors">
              Join with Code
            </button>
            <button onClick={() => setShowCreate(true)}
              className="bg-pink-600 hover:bg-pink-500 text-white px-6 py-3 rounded-2xl font-bold transition-colors">
              Create Group
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map(g => (
            <GroupCard key={g.id} group={g} currentUserId={currentUserId} onOpen={setActiveGroup} onDelete={setDeleteTarget} />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <Modal title="New Study Group" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            {formErr && <p className="text-red-400 text-sm">{formErr}</p>}
            <Field label="Group Name *">
              <input ref={nameRef} className={inputCls} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Backend Study Circle" required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Visibility">
                <select className={inputCls} value={form.is_private ? "private" : "public"} onChange={e => setForm(p => ({ ...p, is_private: e.target.value === "private" }))}>
                  <option value="private">Private</option>
                  <option value="public">Public</option>
                </select>
              </Field>
              <Field label="Max Members">
                <input type="number" min="2" className={inputCls} value={form.max_members} onChange={e => setForm(p => ({ ...p, max_members: e.target.value }))} placeholder="Unlimited" />
              </Field>
            </div>
            <div className="flex gap-3 mt-2">
              <button type="button" onClick={() => setShowCreate(false)}
                className="flex-1 py-3 rounded-xl border border-white/15 text-gray-400 hover:text-white font-semibold text-sm transition-colors">Cancel</button>
              <button type="submit" disabled={saving}
                className="flex-1 py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-sm transition-colors disabled:opacity-50">
                {saving ? "Creating…" : "Create Group"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Join modal */}
      {showJoin && (
        <Modal title="Join a Group" onClose={() => setShowJoin(false)}>
          <form onSubmit={handleJoin} className="flex flex-col gap-4">
            {joinErr && <p className="text-red-400 text-sm">{joinErr}</p>}
            <Field label="Group ID *">
              <input className={inputCls} value={joinGroupId} onChange={e => setJoinGroupId(e.target.value)} placeholder="Paste the group ID" required />
            </Field>
            <Field label="Invite Code *">
              <input className={inputCls} value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="Paste the invite code" required />
            </Field>
            <div className="flex gap-3 mt-2">
              <button type="button" onClick={() => setShowJoin(false)}
                className="flex-1 py-3 rounded-xl border border-white/15 text-gray-400 hover:text-white font-semibold text-sm transition-colors">Cancel</button>
              <button type="submit" disabled={joining}
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors disabled:opacity-50">
                {joining ? "Joining…" : "Join Group"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <Modal title="Delete Group" onClose={() => setDeleteTarget(null)}>
          <p className="text-gray-400 text-sm mb-6">
            Delete <span className="text-white font-semibold">"{deleteTarget.name}"</span> and remove all members? This cannot be undone.
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
