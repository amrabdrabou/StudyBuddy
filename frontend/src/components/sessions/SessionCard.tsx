import type { Session } from "../../api/sessions";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { getSessionStatusTone, SESSION_STATUS_TOKENS } from "../ui/themeTokens";
import { fmtDate, fmtDuration } from "../ui/utils";

export const statusStyles = SESSION_STATUS_TOKENS;

export default function SessionCard({ session, workspaceTitle, onEdit, onDelete }: {
  session: Session;
  workspaceTitle?: string;
  onEdit: (s: Session) => void;
  onDelete: (s: Session) => void;
}) {
  const st = getSessionStatusTone(session.status);

  return (
    <Card className="group hover:bg-white/[0.06] hover:border-emerald-500/20 transition-all duration-200">
      <CardHeader className="p-5 pb-3">
        <div className="flex-1 min-w-0">
          <CardTitle className="truncate">
            {session.title ?? "Untitled Session"}
          </CardTitle>
          <CardDescription className="mt-0.5">{fmtDate(session.started_at)}</CardDescription>
          {workspaceTitle && (
            <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] text-gray-400 border border-white/10 uppercase tracking-wide font-bold">
              {workspaceTitle}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => onEdit(session)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button onClick={() => onDelete(session)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-5 pt-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
            {st.label}
          </span>
          {session.planned_duration_minutes && (
            <span className="text-[10px] bg-white/[0.06] text-gray-400 px-2 py-0.5 rounded-full">
              {fmtDuration(session.planned_duration_minutes)}
            </span>
          )}
        </div>
        {session.notes_text && (
          <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{session.notes_text}</p>
        )}
      </CardContent>
      <CardFooter className="flex gap-3 border-t border-white/[0.05] mt-auto">
        {session.mood_rating != null && (
          <span className="text-[10px] text-gray-500">Mood: <strong className="text-white">{session.mood_rating}/5</strong></span>
        )}
        {session.productivity_rating != null && (
          <span className="text-[10px] text-gray-500">Productivity: <strong className="text-white">{session.productivity_rating}/5</strong></span>
        )}
      </CardFooter>
    </Card>
  );
}
