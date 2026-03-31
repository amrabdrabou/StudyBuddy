import { Card } from "./card";

export default function CompactCard({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Card className={`p-4 ${className}`.trim()} {...props}>
      {children}
    </Card>
  );
}
