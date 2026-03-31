import { getDocumentContent, getDocuments } from "../../api/documents";
import { getWorkspaceStatusClass } from "../ui/themeTokens";

export function statusColor(status: string) {
  return getWorkspaceStatusClass(status as Parameters<typeof getWorkspaceStatusClass>[0]);
}

export async function loadWorkspaceSummaryText(workspaceId: string): Promise<string> {
  const docs = await getDocuments(workspaceId);
  const readyDocs = docs.filter(d => d.status === "ready");
  if (readyDocs.length === 0) return "";

  const contents = await Promise.all(
    readyDocs.map(d => getDocumentContent(workspaceId, d.id).catch(() => null))
  );

  return contents
    .map((content, index) => {
      const doc = readyDocs[index];
      if (!content) return "";
      const text = content.summary?.trim() || content.raw_text?.slice(0, 2000).trim() || "";
      return text ? `--- ${doc.original_filename} ---\n${text}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
}
