"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import {
  ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, Columns3, ExternalLink, MessageSquare, X,
} from "lucide-react";
import { detectSms, FieldInfo } from "@/lib/submission-fields";
import type { Assignee, StatusOption, Submission, SubmissionWithRFI } from "@/lib/api";
import ResponseTracker, { StatusPill, STATUS_STYLE as STATUS_PILL } from "@/components/response-tracker";

const PAGE_SIZE = 50;
const SUBMITTED_W = 160;
const ROWNUM_W = 52;

interface Col {
  key: string;
  label: string;
  get: (s: SubmissionWithRFI) => any;
}

function pick(s: SubmissionWithRFI, f: FieldInfo) {
  return s.data[f.name] ?? s.data[f.label];
}

function plain(v: any): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) {
    if (v.length && v.every((x) => x && typeof x === "object" && "name" in x && "content" in x)) return v.map((x) => x.name).join(", ");
    return v.map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x))).join(", ");
  }
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function Cell({ v }: { v: any }) {
  if (v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) return <span className="text-slate-300">—</span>;
  if (typeof v === "boolean") {
    return v ? (
      <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-blue-600 text-white"><Check className="h-3 w-3" /></span>
    ) : (
      <span className="inline-block h-4 w-4 rounded border border-slate-300 bg-white" />
    );
  }
  if (typeof v === "string" && v.startsWith("data:image")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={v} alt="" className="h-7 rounded border border-slate-200 bg-white" />;
  }
  if (Array.isArray(v)) {
    if (v.length && v.every((x) => x && typeof x === "object" && "name" in x && "content" in x)) {
      return <span className="truncate">{v.map((x) => x.name).join(", ")}</span>;
    }
    if (v.every((x) => x === null || typeof x !== "object")) {
      return (
        <span className="flex flex-wrap gap-1">
          {v.map((x, i) => (
            <span key={i} className="rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[11px] leading-4 text-slate-700 whitespace-nowrap">
              {String(x)}
            </span>
          ))}
        </span>
      );
    }
    return <span className="text-slate-600">{v.length} item{v.length === 1 ? "" : "s"}</span>;
  }
  if (typeof v === "object") return <span className="truncate text-slate-600">{JSON.stringify(v)}</span>;
  return <span className="truncate">{String(v)}</span>;
}

export default function ResponsesGrid({
  rows,
  fields,
  formId,
  statuses,
  assignees,
  onUpdate,
  onOpenForm,
}: {
  rows: SubmissionWithRFI[];
  fields: FieldInfo[];
  formId: string;
  statuses: StatusOption[];
  assignees: Assignee[];
  onUpdate: (s: Submission) => void;
  onOpenForm: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const columns: Col[] = useMemo(() => {
    const cols: Col[] = fields.map((f) => ({ key: `f:${f.name}`, label: f.label, get: (s) => pick(s, f) }));
    const known = new Set(fields.flatMap((f) => [f.name, f.label]));
    const extras = new Set<string>();
    rows.forEach((s) => Object.keys(s.data).forEach((k) => !known.has(k) && extras.add(k)));
    extras.forEach((k) => cols.push({ key: `x:${k}`, label: k, get: (s) => s.data[k] }));
    return cols;
  }, [fields, rows]);

  const hasRespondent = rows.some((s) => s.submitted_by_name || s.submitted_by_email);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: "__submitted", dir: -1 });
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showCols, setShowCols] = useState(false);
  const colsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHidden(new Set());
    setPage(0);
    setSelected(null);
    setStatusFilter(null);
  }, [formId]);

  useEffect(() => {
    setPage(0);
  }, [rows.length, statusFilter]);

  useEffect(() => {
    if (!showCols) return;
    const onDown = (e: MouseEvent) => {
      if (colsRef.current && !colsRef.current.contains(e.target as Node)) setShowCols(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showCols]);

  const visible = columns.filter((c) => !hidden.has(c.key));
  const w = (key: string) => widths[key] ?? 190;

  const statusCounts = useMemo(() => {
    const m: Record<string, number> = {};
    rows.forEach((r) => (m[r.status] = (m[r.status] || 0) + 1));
    return m;
  }, [rows]);

  const sorted = useMemo(() => {
    const arr = statusFilter ? rows.filter((r) => r.status === statusFilter) : [...rows];
    const text = (s: SubmissionWithRFI): string => {
      if (sort.key === "__status") return statuses.find((x) => x.value === s.status)?.label || s.status;
      if (sort.key === "__owner") return s.owner_email || "";
      if (sort.key === "__follow") return s.follow_up_at || "";
      const col = columns.find((c) => c.key === sort.key);
      return col ? plain(col.get(s)) : "";
    };
    if (sort.key === "__submitted") {
      arr.sort((a, b) => sort.dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
    } else {
      arr.sort((a, b) => {
        const av = text(a);
        const bv = text(b);
        if (!av && bv) return 1;
        if (av && !bv) return -1;
        return sort.dir * av.localeCompare(bv, undefined, { numeric: true, sensitivity: "base" });
      });
    }
    return arr;
  }, [rows, sort, columns, statusFilter, statuses]);

  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const sel = selected ? rows.find((r) => r.id === selected) || null : null;
  const today = new Date(new Date().toDateString());

  const toggleSort = (key: string) =>
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === "__submitted" ? -1 : 1 }));

  const startResize = (e: React.PointerEvent, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = w(key);
    const move = (ev: PointerEvent) => setWidths((p) => ({ ...p, [key]: Math.max(80, Math.min(700, startW + ev.clientX - startX)) }));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const SortIcon = ({ k }: { k: string }) =>
    sort.key === k ? (sort.dir === 1 ? <ArrowUp className="h-3 w-3 shrink-0 text-slate-500" /> : <ArrowDown className="h-3 w-3 shrink-0 text-slate-500" />) : null;

  const headBase = "sticky top-0 z-20 bg-slate-100 border-b border-r border-slate-300 text-left text-xs font-semibold text-slate-600 select-none";

  return (
    <div className="flex gap-4 items-start">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <button
            onClick={() => setStatusFilter(null)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${statusFilter === null ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"}`}
          >
            All <span className="opacity-70">{rows.length}</span>
          </button>
          {statuses.map((st) => (
            <button
              key={st.value}
              onClick={() => setStatusFilter(statusFilter === st.value ? null : st.value)}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${statusFilter === st.value ? "ring-2 ring-offset-1 ring-slate-400" : ""} ${STATUS_PILL[st.value] || STATUS_PILL.new}`}
            >
              {st.label} <span className="opacity-70">{statusCounts[st.value] || 0}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-slate-500">
            {sorted.length} row{sorted.length === 1 ? "" : "s"} · {visible.length} of {columns.length} columns
          </div>
          <div className="relative" ref={colsRef}>
            <button
              onClick={() => setShowCols(!showCols)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Columns3 className="h-3.5 w-3.5" /> Columns
            </button>
            {showCols && (
              <div className="absolute right-0 mt-1 z-40 w-64 max-h-80 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg p-2">
                <div className="flex justify-between px-2 pb-1.5 text-[11px]">
                  <button className="text-primary hover:underline" onClick={() => setHidden(new Set())}>Show all</button>
                  <button className="text-slate-500 hover:underline" onClick={() => setHidden(new Set(columns.map((c) => c.key)))}>Hide all</button>
                </div>
                {columns.map((c) => (
                  <label key={c.key} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!hidden.has(c.key)}
                      onChange={() =>
                        setHidden((p) => {
                          const n = new Set(p);
                          if (n.has(c.key)) n.delete(c.key);
                          else n.add(c.key);
                          return n;
                        })
                      }
                      className="accent-indigo-600"
                    />
                    <span className="truncate">{c.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-300 bg-white overflow-auto max-h-[68vh] shadow-sm">
          <table className="border-separate border-spacing-0 text-[13px]" style={{ minWidth: "100%" }}>
            <thead>
              <tr>
                <th className={`${headBase} left-0 z-30 text-center`} style={{ width: ROWNUM_W, minWidth: ROWNUM_W }}>#</th>
                <th
                  className={`${headBase} cursor-pointer hover:bg-slate-200`}
                  style={{ width: SUBMITTED_W, minWidth: SUBMITTED_W, left: ROWNUM_W }}
                  onClick={() => toggleSort("__submitted")}
                >
                  <div className="flex items-center gap-1 px-3 py-2">Submitted <SortIcon k="__submitted" /></div>
                </th>
                {hasRespondent && (
                  <th className={headBase} style={{ width: 200, minWidth: 200 }}>
                    <div className="px-3 py-2">Respondent</div>
                  </th>
                )}
                {([["__status", "Status", 130], ["__owner", "Owner", 170], ["__follow", "Follow-up", 130]] as const).map(([k, text, wd]) => (
                  <th key={k} className={`${headBase} cursor-pointer hover:bg-slate-200`} style={{ width: wd, minWidth: wd }} onClick={() => toggleSort(k)}>
                    <div className="flex items-center gap-1 px-3 py-2">{text} <SortIcon k={k} /></div>
                  </th>
                ))}
                {visible.map((c) => (
                  <th
                    key={c.key}
                    className={`${headBase} relative cursor-pointer hover:bg-slate-200`}
                    style={{ width: w(c.key), minWidth: w(c.key), maxWidth: w(c.key) }}
                    onClick={() => toggleSort(c.key)}
                    title={c.label}
                  >
                    <div className="flex items-center gap-1 px-3 py-2">
                      <span className="truncate">{c.label}</span>
                      <SortIcon k={c.key} />
                    </div>
                    <span
                      onPointerDown={(e) => startResize(e, c.key)}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-indigo-400"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((s, i) => {
                const isSel = s.id === selected;
                const bg = isSel ? "bg-indigo-50" : "bg-white group-hover:bg-slate-50";
                const cell = "border-b border-r border-slate-200 px-3 py-1.5 align-top";
                return (
                  <tr key={s.id} className="group cursor-pointer" onClick={() => setSelected(isSel ? null : s.id)}>
                    <td className={`${cell} ${bg} sticky left-0 z-10 text-center text-xs text-slate-400 tabular-nums`} style={{ width: ROWNUM_W }}>
                      {page * PAGE_SIZE + i + 1}
                    </td>
                    <td className={`${cell} ${bg} sticky z-10 whitespace-nowrap text-slate-600`} style={{ left: ROWNUM_W, width: SUBMITTED_W }}>
                      {format(new Date(s.created_at), "MMM d, yyyy h:mm a")}
                    </td>
                    {hasRespondent && (
                      <td className={`${cell} ${bg}`}>
                        <div className="truncate max-w-[200px]">{s.submitted_by_name || s.submitted_by_email || "—"}</div>
                      </td>
                    )}
                    {visible.map((c) => (
                    <td className={`${cell} ${bg}`}><StatusPill status={s.status} statuses={statuses} /></td>
                    <td className={`${cell} ${bg}`}><div className="truncate max-w-[160px] text-slate-600">{s.owner_email || <span className="text-slate-300">Unassigned</span>}</div></td>
                    <td className={`${cell} ${bg} whitespace-nowrap`}>
                      {s.follow_up_at ? (
                        <span className={new Date(s.follow_up_at) < today && !["enrolled", "not_interested"].includes(s.status) ? "text-red-600 font-medium" : "text-slate-600"}>
                          {format(new Date(s.follow_up_at), "MMM d, yyyy")}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                      <td key={c.key} className={`${cell} ${bg}`} style={{ maxWidth: w(c.key) }} title={plain(c.get(s))}>
                        <div className="overflow-hidden max-h-[3.2rem]"><Cell v={c.get(s)} /></div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-3 text-sm text-slate-500">
          <span>
            Showing {sorted.length === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min(sorted.length, (page + 1) * PAGE_SIZE)} of {sorted.length}
          </span>
          <div className="flex items-center gap-2">
            <button disabled={page === 0} onClick={() => setPage(page - 1)} className="p-1.5 rounded-md border border-slate-300 disabled:opacity-40 hover:bg-slate-50" aria-label="Previous page">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="tabular-nums">{page + 1} / {pages}</span>
            <button disabled={page + 1 >= pages} onClick={() => setPage(page + 1)} className="p-1.5 rounded-md border border-slate-300 disabled:opacity-40 hover:bg-slate-50" aria-label="Next page">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {sel && (
        <aside className="hidden lg:block w-[360px] shrink-0 sticky top-4 max-h-[78vh] overflow-y-auto rounded-lg border border-slate-300 bg-white shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50 sticky top-0">
            <div>
              <div className="text-sm font-semibold text-slate-900">Response</div>
              <div className="text-xs text-slate-500">{format(new Date(sel.created_at), "MMM d, yyyy 'at' h:mm a")}</div>
            </div>
            <button onClick={() => setSelected(null)} className="p-1 rounded hover:bg-slate-200 text-slate-500" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-4 py-3 space-y-3">
            {(sel.submitted_by_name || sel.submitted_by_email) && (
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-400">Respondent</div>
                <div className="text-sm text-slate-900">{sel.submitted_by_name || sel.submitted_by_email}</div>
                {sel.submitted_by_name && sel.submitted_by_email && <div className="text-xs text-slate-500">{sel.submitted_by_email}</div>}
              </div>
            )}
            <div className="pb-3 border-b border-slate-200">
              <ResponseTracker sub={sel} statuses={statuses} assignees={assignees} onUpdate={onUpdate} />
            </div>
            {columns.map((c) => (
              <div key={c.key}>
                <div className="text-[11px] uppercase tracking-wide text-slate-400">{c.label}</div>
                <div className="text-sm text-slate-900 whitespace-pre-wrap break-words">
                  {typeof c.get(sel) === "string" && c.get(sel).startsWith("data:image") ? <Cell v={c.get(sel)} /> : plain(c.get(sel)) || <span className="text-slate-300">—</span>}
                </div>
              </div>
            ))}
            {(() => {
              const sms = detectSms(fields, sel.data);
              return (
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  {sms.hasPhoneField && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={!sms.canSend}
                        title={sms.reason ?? `Send an SMS to ${sms.phone}`}
                        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground shadow-sm hover:opacity-90 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed"
                      >
                        <MessageSquare className="h-4 w-4" /> Send SMS
                      </button>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          sms.optedIn && sms.hasOptInField ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500"
                        }`}
                      >
                        {!sms.hasOptInField ? "No SMS opt-in question" : sms.optedIn ? "Agreed to SMS" : "Did not agree to SMS"}
                      </span>
                      {!sms.canSend && sms.reason && <span className="text-xs text-slate-400">{sms.reason}</span>}
                    </div>
                  )}
                  <button onClick={onOpenForm} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                    Open form <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              );
            })()}
          </div>
        </aside>
      )}
    </div>
  );
}

