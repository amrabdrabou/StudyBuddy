import type { ReactNode } from "react";
import ErrorBanner from "./ErrorBanner";
import PageEmptyState from "./PageEmptyState";
import { PageGrid, PageHeader, PageLayout, PageSection } from "./pageLayout";

type EmptyStateConfig = {
  tone?: "indigo" | "violet";
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
};

export default function MainCollectionPage({
  title,
  description,
  actions,
  error,
  onDismissError,
  filters,
  loading,
  loadingFallback,
  isEmpty,
  emptyState,
  gridClassName,
  children,
  className,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  error?: string | null;
  onDismissError?: () => void;
  filters?: ReactNode;
  loading: boolean;
  loadingFallback: ReactNode;
  isEmpty: boolean;
  emptyState: EmptyStateConfig;
  gridClassName?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <PageLayout className={className}>
      <PageHeader title={title} description={description} actions={actions} />

      {error && onDismissError && (
        <ErrorBanner message={error} onDismiss={onDismissError} />
      )}

      {filters && <PageSection>{filters}</PageSection>}

      {loading ? (
        loadingFallback
      ) : isEmpty ? (
        <PageEmptyState
          tone={emptyState.tone}
          icon={emptyState.icon}
          title={emptyState.title}
          description={emptyState.description}
          action={emptyState.action}
        />
      ) : (
        <PageGrid className={gridClassName}>{children}</PageGrid>
      )}
    </PageLayout>
  );
}
