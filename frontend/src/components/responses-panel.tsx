"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { RefreshCw, Search, Inbox, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Assignee, fetchAllSubmissions, fetchAssignees, fetchRFIs, fetchStatuses, RFI, StatusOption, Submission, SubmissionWithRFI } from "@/lib/api";
import { fieldsForContent, FieldInfo } from "@/lib/submission-fields";
import ResponsesGrid from "@/components/responses-grid";
import { buildExportTable } from "@/lib/export";
import ExportMenu from "@/components/export-menu";
import DateRangePicker from "@/components/date-range-picker";


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
  const [statuses, setStatuses] = useState<StatusOption[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formFilter, setFormFilter] = useState(initialForm);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, r, st, people] = await Promise.all([fetchAllSubmissions(), fetchRFIs(), fetchStatuses(), fetchAssignees()]);
      setStatuses(st);
      setAssignees(people);
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

  const overview = useMemo(() => {
    const map = new Map<string, { id: string; subject: string; count: number; latest: string }>();
    for (const s of filtered) {
      const cur = map.get(s.rfi_id);
      if (cur) {
        cur.count++;
        if (s.created_at > cur.latest) cur.latest = s.created_at;
      } else map.set(s.rfi_id, { id: s.rfi_id, subject: s.rfi_subject, count: 1, latest: s.created_at });
    }
    return Array.from(map.values()).sort((a, b) => b.latest.localeCompare(a.latest));
  }, [filtered]);

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
                }}
                className="pl-9"
              />
            </div>
            {formFilter && (
              <Button variant="outline" size="sm" onClick={() => setFormFilter("")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> All forms
              </Button>
            )}
            <select
              value={formFilter}
              onChange={(e) => {
                setFormFilter(e.target.value);
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
      ) : !formFilter ? (
        <Card className="overflow-hidden">
          <div className="px-5 py-3 border-b bg-slate-50 text-sm text-slate-600">
            Choose a form to see its responses as a sheet.
          </div>
          {overview.length === 0 ? (
            <CardContent className="py-16 text-center">
              <Inbox className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-foreground mb-1">No responses found</h3>
              <p className="text-sm text-muted-foreground">
                {subs.length > 0 ? "No responses match your filters." : "Responses to your published forms will appear here."}
              </p>
            </CardContent>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b">
                  <th className="px-5 py-2.5 font-medium">Form</th>
                  <th className="px-5 py-2.5 font-medium">Responses</th>
                  <th className="px-5 py-2.5 font-medium">Latest</th>
                </tr>
              </thead>
              <tbody>
                {overview.map((f) => {
                  const kind = kindOf(rfiById.get(f.id));
                  return (
                    <tr key={f.id} onClick={() => setFormFilter(f.id)} className="border-b last:border-0 cursor-pointer hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{f.subject}</span>
                          {kind && <Badge variant="draft" className={`${kind.cls} text-xs`}>{kind.label}</Badge>}
                        </div>
                      </td>
                      <td className="px-5 py-3 tabular-nums">{f.count}</td>
                      <td className="px-5 py-3 text-slate-500">{format(new Date(f.latest), "MMM d, yyyy h:mm a")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Inbox className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-foreground mb-1">No responses</h3>
            <p className="text-sm text-muted-foreground">No responses match your filters for this form.</p>
          </CardContent>
        </Card>
      ) : (
        <ResponsesGrid
          rows={filtered}
          fields={fieldsFor(formFilter)}
          formId={formFilter}
          statuses={statuses}
          assignees={assignees}
          onUpdate={(u: Submission) => setSubs((prev) => prev.map((x) => (x.id === u.id ? { ...x, ...u } : x)))}
          onOpenForm={() => router.push(`/rfi/${formFilter}`)}
        />
      )}
    </div>
  );
}
