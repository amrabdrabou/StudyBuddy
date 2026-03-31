export interface GoalPathMatch {
  goalId: string;
}

export interface SubjectPathMatch {
  goalId: string;
  subjectId: string;
}

export interface WorkspacePathMatch {
  goalId: string;
  subjectId: string;
  workspaceId: string;
  tab?: string;
}

export function matchGoalPath(path: string): GoalPathMatch | null {
  const match = path.match(/^\/goals\/([^/]+)$/);
  return match ? { goalId: match[1] } : null;
}

export function matchSubjectPath(path: string): SubjectPathMatch | null {
  const match = path.match(/^\/goals\/([^/]+)\/subjects\/([^/]+)$/);
  return match ? { goalId: match[1], subjectId: match[2] } : null;
}

export function matchWorkspacePath(path: string): WorkspacePathMatch | null {
  const match = path.match(/^\/goals\/([^/]+)\/subjects\/([^/]+)\/workspaces\/([^/]+)(?:\/([^/]+))?$/);
  return match
    ? {
        goalId: match[1],
        subjectId: match[2],
        workspaceId: match[3],
        tab: match[4],
      }
    : null;
}
