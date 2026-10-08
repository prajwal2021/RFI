"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, RefreshCw, Search, Inbox, ExternalLink, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { fetchAllSubmissions, fetchRFIs, RFI, SubmissionWithRFI } from "@/lib/api";
import { buildRows, detectSms, fieldsForContent, FieldInfo } from "@/lib/submission-fields";
import { buildExportTable } from "@/lib/export";
import ExportMenu from "@/components/export-menu";
import DateRangePicker from "@/components/date-range-picker";

const PAGE = 25;

function kindOf(rfi?: RFI): { label: string; cls: string } | null {
  if (!rfi?.content) return null;
  if (rfi.content.surveyDefinition) {
    return rfi.content.surveyEditor === "clone"
      ? { label: "SurveyJS Clone", cls: "bg-teal-100 text-teal-700" }
      : { label: "SurveyJS", cls: "bg-emerald-100 text-emerald-700" };
  }
  if (rfi.content.formDefinition) return { label: "SS Form", cls: "bg-indigo-100 text-indigo-700" };
  return null;
}

function localYmd(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ResponsesPanel({
  initialForm = "",
  initialFrom = "",
  initialTo = "",
}: {
  initialForm?: string;
  initialFrom?: string;
  initialTo?: string;
}) {
  const router = useRouter();
  const [dateFilter, setDateFilter] = useState<{ from: string; to: string } | null>(
    initialFrom ? { from: initialFrom, to: initialTo || initialFrom } : null
  );
  const [rfis, setRfis] = useState<RFI[]>([]);
  const [subs, setSubs] = useState<SubmissionWithRFI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formFilter, setFormFilter] = useState(initialForm);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [shown, setShown] = useState(PAGE);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, r] = await Promise.all([fetchAllSubmissions(), fetchRFIs()]);
      setSubs(s);
      setRfis(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load responses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const rfiById = useMemo(() => new Map(rfis.map((r) => [r.id, r])), [rfis]);
  const fieldCache = useMemo(() => new Map<string, FieldInfo[]>(), [rfis]);
  const fieldsFor = (rfiId: string): FieldInfo[] => {
    let f = fieldCache.get(rfiId);
    if (!f) {
      f = fieldsForContent(rfiById.get(rfiId)?.content);
      fieldCache.set(rfiId, f);
    }
    return f;
  };

  const formsWithResponses = useMemo(() => {
    const map = new Map<string, { id: string; subject: string; count: number }>();
    for (const s of subs) {
      const cur = map.get(s.rfi_id);
      if (cur) cur.count++;
      else map.set(s.rfi_id, { id: s.rfi_id, subject: s.rfi_subject, count: 1 });
    }
    return Array.from(map.values()).sort((a, b) => a.subject.localeCompare(b.subject));
  }, [subs]);

  // Per-day response counts (for the form currently selected) shown inside the calendar.
  const dayCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of subs) {
      if (formFilter && s.rfi_id !== formFilter) continue;
      const k = localYmd(s.created_at);
      m[k] = (m[k] || 0) + 1;
    }
    return m;
  }, [subs, formFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return subs.filter((s) => {
      if (formFilter && s.rfi_id !== formFilter) return false;
      if (dateFilter) {
        const day = localYmd(s.created_at);
        if (day < dateFilter.from || day > dateFilter.to) return false;
      }
      if (!q) return true;
      return (
        s.rfi_subject.toLowerCase().includes(q) ||
        (s.submitted_by_name || "").toLowerCase().includes(q) ||
        (s.submitted_by_email || "").toLowerCase().includes(q) ||
        JSON.stringify(s.data).toLowerCase().includes(q)
      );
    });
  }, [subs, formFilter, dateFilter, search]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div>
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search responses…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShown(PAGE);
                }}
                className="pl-9"
              />
            </div>
            <select
              value={formFilter}
              onChange={(e) => {
                setFormFilter(e.target.value);
                setShown(PAGE);
              }}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full md:w-72"
            >
              <option value="">All forms ({subs.length})</option>
              {formsWithResponses.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.subject} ({f.count})
                </option>
              ))}
            </select>
            <DateRangePicker
              value={dateFilter}
              onChange={(r) => {
                setDateFilter(r);
                setShown(PAGE);
              }}
              counts={dayCounts}
            />
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <ExportMenu
              disabled={filtered.length === 0}
              baseName={formFilter ? rfiById.get(formFilter)?.subject || "responses" : "all_responses"}
              getRows={() => buildExportTable(filtered, fieldsFor)}
            />
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <Button size="sm" onClick={load}>Retry</Button>
          </CardContent>
        </Card>
      ) : loading && subs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Loading responses…</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Inbox className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-foreground mb-1">No responses yet</h3>
            <p className="text-sm text-muted-foreground">
              {subs.length > 0 ? "No responses match your filters." : "Responses to your published forms will appear here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.slice(0, shown).map((s) => {
            const isOpen = expanded.has(s.id);
            const kind = kindOf(rfiById.get(s.rfi_id));
            return (
              <Card key={s.id} className="overflow-hidden">
                <button
                  onClick={() => toggle(s.id)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-gray-50"
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 truncate">{s.rfi_subject}</span>
                      {kind && (
                        <Badge variant="draft" className={`${kind.cls} text-xs`}>
                          {kind.label}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {s.submitted_by_name || s.submitted_by_email || "Anonymous"}
                      {s.submitted_by_name && s.submitted_by_email ? ` · ${s.submitted_by_email}` : ""}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">
                    {format(new Date(s.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t px-5 py-3 bg-gray-50/50">
                    <table className="w-full text-sm">
                      <tbody>
                        {buildRows(fieldsFor(s.rfi_id), s.data).map((row, i) => (
                          <tr key={i} className="border-b border-gray-100 last:border-0">
                            <td className="py-2.5 pr-6 font-medium text-gray-600 align-top w-1/3">{row.label}</td>
                            <td className="py-2.5 text-gray-900 whitespace-pre-wrap break-words">
                              {row.value.startsWith("data:image") ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={row.value} alt="" className="max-h-28 rounded border border-gray-200 bg-white" />
                              ) : (
                                row.value
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(() => {
                      const sms = detectSms(fieldsFor(s.rfi_id), s.data);
                      return (
                        <div className="pt-3 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-3">
                            {sms.hasPhoneField && (
                              <>
                                <button
                                  type="button"
                                  disabled={!(sms.phone && sms.optedIn)}
                                  title={sms.reason ?? `Send an SMS to ${sms.phone}`}
                                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground shadow-sm hover:opacity-90 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed"
                                >
                                  <MessageSquare className="h-4 w-4" /> Send SMS
                                </button>
                                {sms.phone && <span className="text-sm text-slate-600 tabular-nums">{sms.phone}</span>}
                                <span
                                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                                    sms.optedIn
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                      : "border-slate-200 bg-slate-50 text-slate-500"
                                  }`}
                                >
                                  {sms.optedIn ? "Opted in" : "Not opted in"}
                                </span>
                              </>
                            )}
                          </div>
                          <button
                            onClick={() => router.push(`/rfi/${s.rfi_id}`)}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                          >
                            Open form <ExternalLink className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </Card>
            );
          })}
          {filtered.length > shown && (
            <div className="text-center pt-2">
              <Button variant="outline" onClick={() => setShown(shown + PAGE)}>
                Show more ({filtered.length - shown} remaining)
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
