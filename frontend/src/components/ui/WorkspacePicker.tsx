import type { Workspace } from "../../api/workspaces";

export default function WorkspacePicker({ workspaces, selected, onSelect }: {
  workspaces: Workspace[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  if (workspaces.length === 0) return null;
  return (
    <select
      value={selected}
      onChange={e => onSelect(e.target.value)}
      className="rounded-xl bg-white/[0.08] border border-white/15 px-3 py-2 text-white text-sm
                 outline-none focus:border-cyan-500 transition [&>option]:bg-slate-800"
    >
      {workspaces.map(w => (
        <option key={w.id} value={w.id}>{w.title}</option>
      ))}
    </select>
  );
}
