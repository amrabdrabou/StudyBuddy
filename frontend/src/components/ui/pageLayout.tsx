import { cn } from "../../lib/utils";

function PageLayout({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-8 pb-24", className)} {...props}>
      {children}
    </div>
  );
}

function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 flex-wrap", className)}>
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">{title}</h1>
        <p className="text-sm mt-1 text-gray-500">{description}</p>
      </div>
      {actions}
    </div>
  );
}

function PageSection({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-3", className)} {...props}>
      {children}
    </div>
  );
}

function PageGrid({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4", className)} {...props}>
      {children}
    </div>
  );
}

export { PageGrid, PageHeader, PageLayout, PageSection };
