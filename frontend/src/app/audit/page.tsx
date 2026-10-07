"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, ChevronLeft, ChevronRight, RefreshCw, Search, ShieldAlert, ScrollText } from "lucide-react";
import AppHeader from "@/components/app-header";
import { isAdmin } from "@/lib/auth";
import { AuditPage, fetchAudit, fetchAuditActions } from "@/lib/admin";

const PAGE = 50;

function tone(action: string): string {
  if (action.includes("delete") || action.includes("removed") || action === "login_failed") return "bg-red-50 text-red-700 border-red-200";
  if (action.includes("created") || action.includes("added") || action === "login") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (action.includes("published") || action.includes("backup")) return "bg-indigo-50 text-indigo-700 border-indigo-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function label(action: string): string {
  return action.replace(/_/g, " ");
}

function describe(d: Record<string, any> | null): string {
  if (!d) return "";
  return Object.entries(d)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k.replace(/_/g, " ")}: ${Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join(" · ");
}

export default function AuditLogPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [page, setPage] = useState<AuditPage | null>(null);
  const [actions, setActions] = useState<string[]>([]);
  const [action, setAction] = useState("");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAllowed(isAdmin());
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q);
      setOffset(0);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPage(await fetchAudit({ limit: PAGE, offset, action, q: query }));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load audit log");
    } finally {
      setLoading(false);
    }
  }, [offset, action, query]);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  useEffect(() => {
    if (allowed) fetchAuditActions().then(setActions).catch(() => undefined);
  }, [allowed]);

  if (allowed === null) return null;
  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center bg-white border border-slate-200 rounded-xl shadow-sm p-10 max-w-sm">
          <ShieldAlert className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-slate-900 mb-1">Admin access required</h1>
          <p className="text-sm text-slate-500">Only administrators can view the audit log.</p>
        </div>
      </div>
    );
  }

  const total = page?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const current = Math.floor(offset / PAGE) + 1;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <AppHeader
        left={
          <button onClick={() => router.push("/")} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </button>
        }
      />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-8 py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-900">
              <ScrollText className="h-5 w-5 text-indigo-500" /> Audit log
            </h1>
            <p className="text-sm text-slate-500">Who signed in, and who created, changed, published or deleted what.</p>
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col md:flex-row gap-3 p-4 border-b border-slate-100">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by user, item or action…"
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <select
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setOffset(0);
              }}
              className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm md:w-60"
            >
              <option value="">All actions</option>
              {actions.map((a) => (
                <option key={a} value={a}>
                  {label(a)}
                </option>
              ))}
            </select>
          </div>

          {error && <div className="m-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          {!page ? (
            <div className="px-5 py-12 text-center text-sm text-slate-400">Loading…</div>
          ) : page.rows.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-400">No matching activity.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="px-5 py-2.5 font-medium w-44">When</th>
                  <th className="px-5 py-2.5 font-medium">User</th>
                  <th className="px-5 py-2.5 font-medium">Action</th>
                  <th className="px-5 py-2.5 font-medium">Item</th>
                </tr>
              </thead>
              <tbody>
                {page.rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0 align-top hover:bg-slate-50/60">
                    <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                      {r.created_at ? format(new Date(r.created_at), "MMM d, yyyy HH:mm:ss") : "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-800">{r.actor_email || <span className="text-slate-400">system</span>}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${tone(r.action)}`}>{label(r.action)}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-slate-900 break-words">{r.entity_name || "—"}</div>
                      {describe(r.details) && <div className="text-xs text-slate-400 mt-0.5 break-words">{describe(r.details)}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-sm text-slate-500">
            <span>
              {total} event{total === 1 ? "" : "s"}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setOffset(Math.max(0, offset - PAGE))}
                disabled={offset === 0}
                className="p-1.5 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-50"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="tabular-nums">
                {current} / {pages}
              </span>
              <button
                onClick={() => setOffset(offset + PAGE)}
                disabled={offset + PAGE >= total}
                className="p-1.5 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-50"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
