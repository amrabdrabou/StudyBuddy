import type { ReactNode } from "react";
import ErrorBanner from "./ErrorBanner";
import { PageLayout, PageSection } from "./pageLayout";

export default function MainDetailPage({
  breadcrumbs,
  title,
  description,
  meta,
  icon,
  accentColor = "#8b5cf6",
  actions,
  error,
  onDismissError,
  children,
}: {
  breadcrumbs?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  icon?: ReactNode;
  accentColor?: string;
  actions?: ReactNode;
  error?: string | null;
  onDismissError?: () => void;
  children: ReactNode;
}) {
  return (
    <PageLayout>
      {breadcrumbs && <PageSection>{breadcrumbs}</PageSection>}

      <PageSection>
        <div
          className="relative overflow-hidden rounded-2xl border p-6"
          style={{ background: `${accentColor}08`, borderColor: `${accentColor}25` }}
        >
          <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: accentColor }} />
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4 min-w-0">
              {icon && (
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${accentColor}20`, border: `1px solid ${accentColor}30` }}
                >
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-2xl font-extrabold tracking-tight text-white">{title}</h1>
                {description && <div className="text-sm text-gray-400 mt-0.5">{description}</div>}
                {meta && <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">{meta}</div>}
              </div>
            </div>
            {actions}
          </div>
        </div>
      </PageSection>

      {error && onDismissError && (
        <ErrorBanner message={error} onDismiss={onDismissError} />
      )}

      {children}
    </PageLayout>
  );
}
