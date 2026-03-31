import { useEffect, useState } from "react";
import Modal from "./Modal";

const inputCls =
  "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white " +
  "placeholder-gray-600 focus:outline-none focus:border-violet-500 text-sm";

export default function RenameModal({
  title,
  label,
  initialValue,
  placeholder,
  confirmLabel = "Save",
  saving = false,
  error = "",
  onClose,
  onSubmit,
}: {
  title: string;
  label: string;
  initialValue: string;
  placeholder?: string;
  confirmLabel?: string;
  saving?: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (value: string) => Promise<void> | void;
}) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const trimmed = value.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmed || trimmed === initialValue.trim()) return;
    await onSubmit(trimmed);
  };

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">{label}</label>
          <input
            autoFocus
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={placeholder}
            maxLength={200}
            className={inputCls}
          />
        </div>

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-white/15 text-gray-400 hover:text-white font-semibold text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !trimmed || trimmed === initialValue.trim()}
            className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
