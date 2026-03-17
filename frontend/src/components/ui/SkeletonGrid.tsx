export default function SkeletonGrid({ cols = 3, count = 6, height = "h-32" }: {
  cols?: 2 | 3 | 4;
  count?: number;
  height?: string;
}) {
  const colClass = cols === 4
    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
    : cols === 2
    ? "grid-cols-1 sm:grid-cols-2"
    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={`grid ${colClass} gap-4`}>
      {[...Array(count)].map((_, i) => (
        <div key={i} className={`${height} bg-white/[0.04] rounded-2xl animate-pulse`} />
      ))}
    </div>
  );
}
