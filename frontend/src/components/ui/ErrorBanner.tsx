export default function ErrorBanner({ message, onDismiss }: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div className="rounded-2xl bg-red-500/10 border border-red-400/20 px-5 py-4 text-sm text-red-300 flex items-center justify-between">
      {message}
      <button onClick={onDismiss} className="text-red-400 hover:text-red-200 ml-4">✕</button>
    </div>
  );
}
