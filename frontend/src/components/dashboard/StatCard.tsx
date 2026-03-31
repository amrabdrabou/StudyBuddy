import { Card, CardContent } from "../ui/card";

export default function StatCard({ label, value, accent, icon, onClick }: {
  label: string;
  value: string | number;
  accent: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className={`text-center${onClick ? " cursor-pointer hover:bg-white/10 transition-colors" : ""}`}
    >
      <CardContent className="p-5">
        {icon && <div className="flex justify-center mb-2">{icon}</div>}
        <p className={`text-3xl font-black ${accent}`}>{value}</p>
        <p className="text-gray-500 text-xs mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}
