import type { Document, DocumentStatus } from "../../api/documents";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { fmtDate, fmtSize } from "../ui/utils";

export const statusStyles: Record<DocumentStatus, { bg: string; text: string; label: string; dot: string }> = {
  uploaded:   { bg: "bg-gray-500/15",    text: "text-gray-400",    label: "Uploaded",   dot: "bg-gray-500"    },
  processing: { bg: "bg-amber-500/15",   text: "text-amber-400",   label: "Processing", dot: "bg-amber-400"   },
  ready:      { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "Ready",      dot: "bg-emerald-400" },
  failed:     { bg: "bg-red-500/15",     text: "text-red-400",     label: "Failed",     dot: "bg-red-400"     },
};

export function fileIcon(mime: string) {
  if (mime.includes("pdf")) return { icon: "PDF", color: "bg-red-500/15 text-red-400 border-red-400/20" };
  if (mime.includes("word") || mime.includes("doc")) return { icon: "DOC", color: "bg-blue-500/15 text-blue-400 border-blue-400/20" };
  if (mime.includes("text")) return { icon: "TXT", color: "bg-gray-500/15 text-gray-400 border-gray-400/20" };
  if (mime.includes("sheet") || mime.includes("csv") || mime.includes("excel")) return { icon: "XLS", color: "bg-emerald-500/15 text-emerald-400 border-emerald-400/20" };
  return { icon: "FILE", color: "bg-slate-500/15 text-slate-400 border-slate-400/20" };
}

export default function DocumentCard({ doc, workspaceTitle, onDelete }: {
  doc: Document;
  workspaceTitle?: string;
  onDelete: (d: Document) => void;
}) {
  const st = statusStyles[doc.status];
  const fi = fileIcon(doc.mime_type);

  return (
    <Card className="group hover:bg-white/[0.06] hover:border-cyan-500/20 transition-all duration-200">
      <CardHeader className="items-start gap-3 p-5 pb-4">
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 text-[10px] font-black ${fi.color}`}>
          {fi.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="truncate">{doc.original_filename}</CardTitle>
            <button onClick={() => onDelete(doc)}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
              {doc.status === "processing" && (
                <span className={`w-1.5 h-1.5 rounded-full ${st.dot} animate-pulse`} />
              )}
              {st.label}
            </span>
            {workspaceTitle && (
              <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/[0.04] text-gray-400 border border-white/10 uppercase tracking-wide">
                {workspaceTitle}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        {doc.error_message && (
          <p className="text-xs text-red-400 bg-red-500/10 rounded-xl px-3 py-2">{doc.error_message}</p>
        )}
      </CardContent>
      <CardFooter className="flex justify-between text-xs text-gray-600 border-t border-white/[0.05]">
        <span>{fmtSize(doc.file_size)}</span>
        <span>{fmtDate(doc.created_at)}</span>
      </CardFooter>
    </Card>
  );
}
