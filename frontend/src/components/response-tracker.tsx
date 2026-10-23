"use client";

import { useEffect, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Bell, CheckCircle2, MessageSquarePlus, UserRound, Inbox, ArrowRight } from "lucide-react";
import {
  addSubmissionNote, Assignee, fetchSubmissionEvents, StatusOption, Submission, SubmissionEvent, updateSubmission,
} from "@/lib/api";

export const STATUS_STYLE: Record<string, string> = {
  new: "bg-blue-50 text-blue-700 border-blue-200",
  contacted: "bg-amber-50 text-amber-700 border-amber-200",
  interested: "bg-violet-50 text-violet-700 border-violet-200",
  applied: "bg-cyan-50 text-cyan-700 border-cyan-200",
  enrolled: "bg-emerald-50 text-emerald-700 border-emerald-200",
  not_interested: "bg-slate-100 text-slate-500 border-slate-200",
};

export function StatusPill({ status, statuses }: { status: string; statuses: StatusOption[] }) {
  const label = statuses.find((s) => s.value === status)?.label || status;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${STATUS_STYLE[status] || STATUS_STYLE.new}`}>
      {label}
    </span>
  );
}

function toLocalDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function label(statuses: StatusOption[], v: string | null | undefined) {
  return statuses.find((s) => s.value === v)?.label || v || "—";
}

function describe(e: SubmissionEvent, statuses: StatusOption[]): React.ReactNode {
  const d = e.data || {};
  switch (e.kind) {
    case "submitted":
      return "Response submitted";
    case "status":
      return (
        <span className="inline-flex flex-wrap items-center gap-1">
          Status <b>{label(statuses, d.from)}</b> <ArrowRight className="h-3 w-3 text-slate-400" /> <b>{label(statuses, d.to)}</b>
        </span>
      );
    case "owner":
      return d.to ? <>Assigned to <b>{d.to}</b></> : <>Unassigned (was <b>{d.from}</b>)</>;
    case "follow_up":
      return d.to ? <>Follow-up set for <b>{format(new Date(d.to), "MMM d, yyyy")}</b></> : "Follow-up cleared";
    case "note":
      return <span className="whitespace-pre-wrap break-words">{d.text}</span>;
    default:
      return e.kind;
  }
}

function icon(kind: SubmissionEvent["kind"]) {
  const c = "h-3.5 w-3.5";
  if (kind === "submitted") return <Inbox className={c} />;
  if (kind === "status") return <CheckCircle2 className={c} />;
  if (kind === "owner") return <UserRound className={c} />;
  if (kind === "follow_up") return <Bell className={c} />;
  return <MessageSquarePlus className={c} />;
}

export default function ResponseTracker({
  sub, statuses, assignees, onUpdate,
}: {
  sub: Submission;
  statuses: StatusOption[];
  assignees: Assignee[];
  onUpdate: (s: Submission) => void;
}) {
  const [events, setEvents] = useState<SubmissionEvent[] | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = () =>
    fetchSubmissionEvents(sub.id).then(setEvents).catch((e) => setError(e instanceof Error ? e.message : "Failed to load the timeline"));

  useEffect(() => {
    setEvents(null);
    setError(null);
    setNote("");
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sub.id]);

  const apply = async (patch: Parameters<typeof updateSubmission>[1]) => {
    setBusy(true);
    setError(null);
    try {
      onUpdate(await updateSubmission(sub.id, patch));
      await loadEvents();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  const submitNote = async () => {
    if (!note.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await addSubmissionNote(sub.id, note.trim());
      setNote("");
      await loadEvents();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add the note");
    } finally {
      setBusy(false);
    }
  };

  const field = "w-full h-9 px-2.5 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-60";
  const overdue = sub.follow_up_at && new Date(sub.follow_up_at) < new Date(new Date().toDateString()) && !["enrolled", "not_interested"].includes(sub.status);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="block col-span-2">
          <span className="block text-[11px] uppercase tracking-wide text-slate-400 mb-1">Status</span>
          <select value={sub.status} disabled={busy} onChange={(e) => apply({ status: e.target.value })} className={field}>
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-[11px] uppercase tracking-wide text-slate-400 mb-1">Owner</span>
          <select
            value={sub.owner_id || ""}
            disabled={busy}
            onChange={(e) => (e.target.value ? apply({ owner_id: e.target.value }) : apply({ clear_owner: true }))}
            className={field}
          >
            <option value="">Unassigned</option>
            {assignees.map((a) => (
              <option key={a.id} value={a.id}>{a.email}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={`block text-[11px] uppercase tracking-wide mb-1 ${overdue ? "text-red-500" : "text-slate-400"}`}>
            Follow-up{overdue ? " (overdue)" : ""}
          </span>
          <input
            type="date"
            value={toLocalDate(sub.follow_up_at)}
            disabled={busy}
            onChange={(e) => (e.target.value ? apply({ follow_up_at: new Date(`${e.target.value}T12:00:00`).toISOString() }) : apply({ clear_follow_up: true }))}
            className={`${field} ${overdue ? "border-red-300 text-red-700" : ""}`}
          />
        </label>
      </div>

      <div>
        <span className="block text-[11px] uppercase tracking-wide text-slate-400 mb-1">Add a note</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={4000}
          placeholder="Called and left a voicemail…"
          className="w-full px-2.5 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
        />
        <div className="flex justify-end mt-1.5">
          <button
            onClick={submitNote}
            disabled={busy || !note.trim()}
            className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
          >
            Add note
          </button>
        </div>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

      <div>
        <span className="block text-[11px] uppercase tracking-wide text-slate-400 mb-2">Timeline</span>
        {!events ? (
          <div className="text-xs text-slate-400">Loading…</div>
        ) : (
          <ol className="relative border-l border-slate-200 ml-1.5 space-y-3">
            {events.map((e) => (
              <li key={e.id} className="pl-4 relative">
                <span className={`absolute -left-[9px] top-0.5 h-[18px] w-[18px] rounded-full border bg-white flex items-center justify-center ${e.kind === "note" ? "text-amber-600 border-amber-200" : "text-slate-500 border-slate-300"}`}>
                  {icon(e.kind)}
                </span>
                <div className={`text-[13px] text-slate-800 ${e.kind === "note" ? "rounded-md bg-amber-50 border border-amber-100 px-2.5 py-1.5" : ""}`}>
                  {describe(e, statuses)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5" title={format(new Date(e.created_at), "MMM d, yyyy h:mm a")}>
                  {e.actor_email ? `${e.actor_email} · ` : ""}
                  {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
