import type { BigGoalStatus } from "../../api/big_goals";
import type { DocumentStatus } from "../../api/documents";
import type { SessionStatus } from "../../api/sessions";
import type { WorkspaceStatus } from "../../api/workspaces";

export type ThemeStatusTone = {
  bg: string;
  text: string;
  label?: string;
  border?: string;
  bar?: string;
  dot?: string;
};

export type SubjectAccentTone = {
  icon: string;
  iconBg: string;
  iconBgHover: string;
  border: string;
};

export const WORKSPACE_STATUS_TOKENS: Record<WorkspaceStatus | "abandoned", ThemeStatusTone> = {
  active: { bg: "bg-emerald-400/10", text: "text-emerald-400", label: "Active" },
  paused: { bg: "bg-amber-400/10", text: "text-amber-400", label: "Paused" },
  completed: { bg: "bg-blue-400/10", text: "text-blue-400", label: "Completed" },
  canceled: { bg: "bg-red-400/10", text: "text-red-400", label: "Canceled" },
  abandoned: { bg: "bg-red-400/10", text: "text-red-400", label: "Abandoned" },
};

export const DOCUMENT_STATUS_TOKENS: Record<DocumentStatus, ThemeStatusTone> = {
  uploaded: { bg: "bg-slate-400/10", text: "text-slate-300", label: "Uploaded" },
  processing: { bg: "bg-amber-400/10", text: "text-amber-400", label: "Processing" },
  ready: { bg: "bg-emerald-400/10", text: "text-emerald-400", label: "Ready" },
  failed: { bg: "bg-red-400/10", text: "text-red-400", label: "Failed" },
};

export const SESSION_STATUS_TOKENS: Record<SessionStatus, ThemeStatusTone> = {
  active: { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "Active" },
  paused: { bg: "bg-amber-500/15", text: "text-amber-400", label: "Paused" },
  completed: { bg: "bg-indigo-500/15", text: "text-indigo-400", label: "Completed" },
  abandoned: { bg: "bg-red-500/15", text: "text-red-400", label: "Abandoned" },
};

export const MISSION_STATUS_TOKENS: Record<BigGoalStatus, ThemeStatusTone> = {
  active: {
    bg: "bg-emerald-400/10",
    text: "text-emerald-400",
    border: "border-emerald-400/20",
    label: "Active",
    bar: "bg-emerald-500",
  },
  paused: {
    bg: "bg-amber-400/10",
    text: "text-amber-400",
    border: "border-amber-400/20",
    label: "Paused",
    bar: "bg-amber-500",
  },
  completed: {
    bg: "bg-blue-400/10",
    text: "text-blue-400",
    border: "border-blue-400/20",
    label: "Completed",
    bar: "bg-blue-500",
  },
  canceled: {
    bg: "bg-red-400/10",
    text: "text-red-400",
    border: "border-red-400/20",
    label: "Canceled",
    bar: "bg-red-500",
  },
  overdue: {
    bg: "bg-red-400/10",
    text: "text-red-400",
    border: "border-red-400/20",
    label: "Overdue",
    bar: "bg-red-500",
  },
  ready_to_complete: {
    bg: "bg-cyan-400/10",
    text: "text-cyan-400",
    border: "border-cyan-400/20",
    label: "Ready To Complete",
    bar: "bg-cyan-500",
  },
};

export const SUBJECT_ACCENT_TOKENS: SubjectAccentTone[] = [
  { icon: "text-violet-400", iconBg: "bg-violet-500/15 border-violet-500/20", iconBgHover: "group-hover:border-violet-500/50", border: "hover:border-violet-500/60" },
  { icon: "text-indigo-400", iconBg: "bg-indigo-500/15 border-indigo-500/20", iconBgHover: "group-hover:border-indigo-500/50", border: "hover:border-indigo-500/60" },
  { icon: "text-cyan-400", iconBg: "bg-cyan-500/15 border-cyan-500/20", iconBgHover: "group-hover:border-cyan-500/50", border: "hover:border-cyan-500/60" },
  { icon: "text-emerald-400", iconBg: "bg-emerald-500/15 border-emerald-500/20", iconBgHover: "group-hover:border-emerald-500/50", border: "hover:border-emerald-500/60" },
  { icon: "text-amber-400", iconBg: "bg-amber-500/15 border-amber-500/20", iconBgHover: "group-hover:border-amber-500/50", border: "hover:border-amber-500/60" },
  { icon: "text-rose-400", iconBg: "bg-rose-500/15 border-rose-500/20", iconBgHover: "group-hover:border-rose-500/50", border: "hover:border-rose-500/60" },
];

export function getWorkspaceStatusClass(status: WorkspaceStatus | "abandoned" | DocumentStatus) {
  if (status in DOCUMENT_STATUS_TOKENS) {
    const tone = DOCUMENT_STATUS_TOKENS[status as DocumentStatus];
    return `${tone.text} ${tone.bg}`;
  }

  const workspaceStatus = status as WorkspaceStatus | "abandoned";
  const tone = WORKSPACE_STATUS_TOKENS[workspaceStatus] ?? WORKSPACE_STATUS_TOKENS.canceled;
  return `${tone.text} ${tone.bg}`;
}

export function getSessionStatusTone(status: SessionStatus) {
  return SESSION_STATUS_TOKENS[status] ?? SESSION_STATUS_TOKENS.abandoned;
}

export function getMissionStatusTone(status: BigGoalStatus) {
  return MISSION_STATUS_TOKENS[status] ?? MISSION_STATUS_TOKENS.canceled;
}
