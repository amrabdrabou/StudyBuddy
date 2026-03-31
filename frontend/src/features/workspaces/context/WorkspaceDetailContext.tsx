import { createContext, useContext } from "react";

type WorkspaceDetailContextValue = {
  workspaceId: string;
  workspaceTitle: string;
  subjectId: string;
};

const WorkspaceDetailContext = createContext<WorkspaceDetailContextValue | null>(null);

export function WorkspaceDetailProvider({
  value,
  children,
}: {
  value: WorkspaceDetailContextValue;
  children: React.ReactNode;
}) {
  return (
    <WorkspaceDetailContext.Provider value={value}>
      {children}
    </WorkspaceDetailContext.Provider>
  );
}

export function useWorkspaceDetailContext() {
  const context = useContext(WorkspaceDetailContext);
  if (!context) {
    throw new Error("useWorkspaceDetailContext must be used within a WorkspaceDetailProvider");
  }
  return context;
}
