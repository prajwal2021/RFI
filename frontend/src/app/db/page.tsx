"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown, ChevronRight, ChevronLeft, Database, Table2, Key, Link2, RefreshCw, ShieldAlert,
} from "lucide-react";
import { isAdmin } from "@/lib/auth";
import { DbRows, DbTable, fetchDbRows, fetchDbTables } from "@/lib/db";

const PAGE_SIZES = [25, 50, 100, 200];

function cellText(v: any): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export default function DbBrowserPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [tables, setTables] = useState<DbTable[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [rows, setRows] = useState<DbRows | null>(null);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rootOpen, setRootOpen] = useState(true);
  const [tablesOpen, setTablesOpen] = useState(true);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [openRow, setOpenRow] = useState<number | null>(null);

  useEffect(() => {
    setAllowed(isAdmin());
  }, []);

  const loadTables = useCallback(async () => {
    try {
      const t = await fetchDbTables();
      setTables(t);
      setSelected((cur) => cur ?? t[0]?.name ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tables");
    }
  }, []);

  const loadRows = useCallback(async () => {
    if (!selected) return;
    setLoading(true);
    try {
      setRows(await fetchDbRows(selected, limit, offset));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load records");
    } finally {
      setLoading(false);
    }
  }, [selected, limit, offset]);

  useEffect(() => {
    if (allowed) loadTables();
  }, [allowed, loadTables]);

  useEffect(() => {
    if (allowed) loadRows();
  }, [allowed, loadRows]);

  if (allowed === null) return null;
  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white border rounded-xl shadow-sm p-10 max-w-sm">
          <ShieldAlert className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-gray-900 mb-1">Admin access required</h1>
          <p className="text-sm text-gray-500">Only administrator accounts can browse the database.</p>
        </div>
      </div>
    );
  }

  const current = tables.find((t) => t.name === selected) || null;
  const page = Math.floor(offset / limit) + 1;
  const pages = rows ? Math.max(1, Math.ceil(rows.total / limit)) : 1;

  const selectTable = (name: string) => {
    setSelected(name);
    setOffset(0);
    setOpenRow(null);
    setRows(null);
  };

  const toggleColumns = (name: string) =>
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="h-12 shrink-0 flex items-center justify-between px-4 bg-slate-800 text-white">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-sky-300" />
          <span className="text-sm font-semibold tracking-wide">Database Browser</span>
          <span className="ml-3 text-xs text-slate-400">read-only</span>
        </div>
        <button
          onClick={() => {
            loadTables();
            loadRows();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded hover:bg-white/10"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Tree */}
        <aside className="w-72 shrink-0 bg-white border-r overflow-y-auto py-3 text-sm">
          <button
            onClick={() => setRootOpen(!rootOpen)}
            className="w-full flex items-center gap-1.5 px-3 py-1.5 font-semibold text-gray-800 hover:bg-gray-50"
          >
            {rootOpen ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
            <Database className="h-4 w-4 text-sky-600" /> rfi_db
          </button>
          {rootOpen && (
            <div className="ml-4">
              <button
                onClick={() => setTablesOpen(!tablesOpen)}
                className="w-full flex items-center gap-1.5 px-3 py-1.5 text-gray-700 hover:bg-gray-50"
              >
                {tablesOpen ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                <span className="font-medium">public</span>
                <span className="text-xs text-gray-400">({tables.length} tables)</span>
              </button>
              {tablesOpen &&
                tables.map((t) => (
                  <div key={t.name} className="ml-4">
                    <div
                      className={`flex items-center rounded ${selected === t.name ? "bg-sky-50 text-sky-800" : "text-gray-700 hover:bg-gray-50"}`}
                    >
                      <button onClick={() => toggleColumns(t.name)} className="p-1.5 text-gray-400 hover:text-gray-600" aria-label="Toggle columns">
                        {expandedTables.has(t.name) ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => selectTable(t.name)} className="flex-1 flex items-center gap-1.5 py-1.5 text-left min-w-0">
                        <Table2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{t.name}</span>
                      </button>
                      <span className="pr-2 text-[11px] text-gray-400">{t.row_count}</span>
                    </div>
                    {expandedTables.has(t.name) && (
                      <div className="ml-6 mb-1 border-l border-gray-200 pl-2">
                        {t.columns.map((c) => (
                          <div key={c.name} className="flex items-center gap-1.5 py-0.5 text-xs text-gray-600">
                            {c.primary_key ? (
                              <Key className="h-3 w-3 text-amber-500 shrink-0" />
                            ) : c.foreign_key ? (
                              <Link2 className="h-3 w-3 text-sky-500 shrink-0" />
                            ) : (
                              <span className="w-3 shrink-0" />
                            )}
                            <span className="truncate">{c.name}</span>
                            <span className="ml-auto text-[10px] text-gray-400 shrink-0">{c.type.toLowerCase()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </aside>

        {/* Records */}
        <main className="flex-1 min-w-0 flex flex-col">
          {error && <div className="m-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</div>}

          {current ? (
            <>
              <div className="flex items-center justify-between px-5 py-3 bg-white border-b">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">{current.name}</h2>
                  <p className="text-xs text-gray-500">
                    {rows ? rows.total : current.row_count} record{(rows ? rows.total : current.row_count) === 1 ? "" : "s"} ·{" "}
                    {current.columns.length} columns
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setOffset(0);
                    }}
                    className="border border-gray-300 rounded px-2 py-1 bg-white"
                  >
                    {PAGE_SIZES.map((s) => (
                      <option key={s} value={s}>{s} / page</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    disabled={offset === 0}
                    className="p-1.5 border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-gray-600 tabular-nums">
                    {page} / {pages}
                  </span>
                  <button
                    onClick={() => setOffset(offset + limit)}
                    disabled={!rows || offset + limit >= rows.total}
                    className="p-1.5 border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                {!rows ? (
                  <div className="p-8 text-sm text-gray-400">Loading records…</div>
                ) : rows.rows.length === 0 ? (
                  <div className="p-8 text-sm text-gray-400">This table has no records.</div>
                ) : (
                  <table className="min-w-full text-xs border-separate border-spacing-0">
                    <thead>
                      <tr>
                        <th className="sticky top-0 z-10 bg-slate-100 border-b border-r px-3 py-2 text-left font-semibold text-gray-500 w-10">#</th>
                        {rows.columns.map((c) => (
                          <th key={c} className="sticky top-0 z-10 bg-slate-100 border-b border-r px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.rows.map((row, i) => (
                        <>
                          <tr
                            key={i}
                            onClick={() => setOpenRow(openRow === i ? null : i)}
                            className={`cursor-pointer ${openRow === i ? "bg-sky-50" : "bg-white hover:bg-gray-50"}`}
                          >
                            <td className="border-b border-r px-3 py-1.5 text-gray-400">{rows.offset + i + 1}</td>
                            {rows.columns.map((c) => {
                              const v = row[c];
                              return (
                                <td key={c} className="border-b border-r px-3 py-1.5 font-mono text-gray-800 max-w-[280px] truncate" title={cellText(v)}>
                                  {v === null || v === undefined ? <span className="italic text-gray-300">NULL</span> : cellText(v)}
                                </td>
                              );
                            })}
                          </tr>
                          {openRow === i && (
                            <tr key={`${i}-detail`}>
                              <td colSpan={rows.columns.length + 1} className="border-b bg-slate-50 px-4 py-3">
                                <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap break-words max-h-80 overflow-auto">
                                  {JSON.stringify(row, null, 2)}
                                </pre>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            !error && <div className="p-8 text-sm text-gray-400">Select a table on the left.</div>
          )}
        </main>
      </div>
    </div>
  );
}
