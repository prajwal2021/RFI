"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { FileText, Globe, Inbox, TrendingUp, X, ArrowUpRight, Trophy } from "lucide-react";
import { Analytics, AnalyticsDay, fetchAnalytics } from "@/lib/api";

const RANGES = [30, 90, 180] as const;
const IND = "#6366f1";
const EMR = "#10b981";

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parse(date: string): Date {
  return new Date(`${date}T12:00:00`);
}

interface Bucket {
  key: string;
  start: string;
  end: string;
  dates: string[];
  created: number;
  responses: number;
}

function Kpi({ icon, label, value, tint, hint }: { icon: React.ReactNode; label: string; value: number | string; tint: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span className={`h-9 w-9 rounded-lg flex items-center justify-center ${tint}`}>{icon}</span>
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

export default function DashboardAnalytics({
  onOpenResponses,
}: {
  onOpenResponses: (rfiId: string, from: string, to: string) => void;
}) {
  const router = useRouter();
  const [range, setRange] = useState<(typeof RANGES)[number]>(30);
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    setData(null);
    setError(null);
    setSelected(null);
    fetchAnalytics(range)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load analytics"));
  }, [range]);

  const byDate = useMemo(() => {
    const m = new Map<string, AnalyticsDay>();
    data?.days.forEach((d) => m.set(d.date, d));
    return m;
  }, [data]);

  const dates = useMemo(
    () =>
      Array.from({ length: range }, (_, i) => {
        const d = new Date();
        d.setHours(12, 0, 0, 0);
        d.setDate(d.getDate() - (range - 1 - i));
        return ymd(d);
      }),
    [range]
  );

  // Daily bars for a month; weekly bars (ending today) for longer ranges.
  const weekly = range > 31;
  const buckets: Bucket[] = useMemo(() => {
    const groups: string[][] = [];
    if (weekly) {
      for (let end = dates.length; end > 0; end -= 7) groups.unshift(dates.slice(Math.max(0, end - 7), end));
    } else {
      dates.forEach((d) => groups.push([d]));
    }
    return groups.map((ds) => ({
      key: ds[0],
      start: ds[0],
      end: ds[ds.length - 1],
      dates: ds,
      created: ds.reduce((a, d) => a + (byDate.get(d)?.created_count || 0), 0),
      responses: ds.reduce((a, d) => a + (byDate.get(d)?.responses_count || 0), 0),
    }));
  }, [dates, byDate, weekly]);

  const sumCreated = buckets.reduce((a, b) => a + b.created, 0);
  const sumResponses = buckets.reduce((a, b) => a + b.responses, 0);
  const avg = range ? sumResponses / range : 0;

  const peak = Math.max(1, ...buckets.map((b) => Math.max(b.created, b.responses)));
  const niceMax = peak <= 4 ? 4 : Math.ceil(peak / 4) * 4;

  // ── chart geometry ──
  const W = 1000;
  const H = 280;
  const padL = 38;
  const padR = 10;
  const padT = 22;
  const padB = 30;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const step = plotW / buckets.length;
  const barW = Math.max(3, Math.min(18, step * 0.3));
  const y = (v: number) => padT + plotH - (v / niceMax) * plotH;
  const cx = (i: number) => padL + (i + 0.5) * step;
  const tickEvery = Math.ceil(buckets.length / 8);
  const todayKey = dates[dates.length - 1];
  const showValues = step >= 34;

  const bucketLabel = (b: Bucket) =>
    b.start === b.end ? format(parse(b.start), "EEE, MMM d") : `${format(parse(b.start), "MMM d")} – ${format(parse(b.end), "MMM d")}`;

  // ── top forms in range ──
  const topForms = useMemo(() => {
    const m = new Map<string, { id: string; subject: string; count: number }>();
    data?.days.forEach((d) =>
      d.responses.forEach((r) => {
        const cur = m.get(r.rfi_id);
        if (cur) cur.count += r.count;
        else m.set(r.rfi_id, { id: r.rfi_id, subject: r.subject, count: r.count });
      })
    );
    return Array.from(m.values()).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [data]);
  const topMax = Math.max(1, ...topForms.map((f) => f.count));

  // ── selected bucket details ──
  const selBucket = buckets.find((b) => b.key === selected) || null;
  const detail = useMemo(() => {
    if (!selBucket) return null;
    const created: { id: string; subject: string }[] = [];
    const resp = new Map<string, { rfi_id: string; subject: string; count: number }>();
    selBucket.dates.forEach((d) => {
      const day = byDate.get(d);
      day?.created.forEach((c) => created.push(c));
      day?.responses.forEach((r) => {
        const cur = resp.get(r.rfi_id);
        if (cur) cur.count += r.count;
        else resp.set(r.rfi_id, { ...r });
      });
    });
    return { created, responses: Array.from(resp.values()).sort((a, b) => b.count - a.count) };
  }, [selBucket, byDate]);

  const hoverBucket = hover !== null ? buckets[hover] : null;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={<FileText className="h-5 w-5 text-indigo-600" />} tint="bg-indigo-50" label="Total forms" value={data?.totals.forms ?? "—"} />
        <Kpi icon={<Globe className="h-5 w-5 text-emerald-600" />} tint="bg-emerald-50" label="Published" value={data?.totals.published ?? "—"} />
        <Kpi icon={<Inbox className="h-5 w-5 text-violet-600" />} tint="bg-violet-50" label="Total responses" value={data?.totals.responses ?? "—"} />
        <Kpi
          icon={<TrendingUp className="h-5 w-5 text-amber-600" />}
          tint="bg-amber-50"
          label={`Responses · last ${range} days`}
          value={data ? sumResponses : "—"}
          hint={data ? `${avg.toFixed(1)} per day on average` : undefined}
        />
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Activity bars */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Activity</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {weekly ? "Per week" : "Per day"} · click a bar to see what happened
            </p>
          </div>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: IND }} /> Responses <b className="text-slate-900">{sumResponses}</b></span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: EMR }} /> Created <b className="text-slate-900">{sumCreated}</b></span>
            </div>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              {RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1 text-xs font-medium rounded-md ${range === r ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-800"}`}
                >
                  {r}d
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none" onMouseLeave={() => setHover(null)}>
            {[0, 1, 2, 3, 4].map((i) => {
              const v = (niceMax / 4) * i;
              return (
                <g key={i}>
                  <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke={i === 0 ? "#e2e8f0" : "#f1f5f9"} />
                  <text x={padL - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#94a3b8">{Math.round(v)}</text>
                </g>
              );
            })}

            {buckets.map((b, i) =>
              i % tickEvery === 0 ? (
                <text key={b.key} x={cx(i)} y={H - 9} textAnchor="middle" fontSize="11" fill="#94a3b8">
                  {!weekly && b.key === todayKey ? "Today" : format(parse(b.start), "MMM d")}
                </text>
              ) : null
            )}

            {buckets.map((b, i) => {
              const isSel = selected === b.key;
              const isHover = hover === i;
              const x0 = cx(i);
              return (
                <g key={b.key}>
                  {(isSel || isHover) && (
                    <rect x={padL + i * step + 1} y={padT - 6} width={step - 2} height={plotH + 6} rx="6" fill={isSel ? "#eef2ff" : "#f8fafc"} />
                  )}
                  {b.responses > 0 && (
                    <rect x={x0 - barW - 1} y={y(b.responses)} width={barW} height={y(0) - y(b.responses)} rx="3" fill={IND} />
                  )}
                  {b.created > 0 && (
                    <rect x={x0 + 1} y={y(b.created)} width={barW} height={y(0) - y(b.created)} rx="3" fill={EMR} />
                  )}
                  {showValues && b.responses > 0 && (
                    <text x={x0 - barW / 2 - 1} y={y(b.responses) - 5} textAnchor="middle" fontSize="10" fill="#4f46e5" fontWeight="600">{b.responses}</text>
                  )}
                  {showValues && b.created > 0 && (
                    <text x={x0 + barW / 2 + 1} y={y(b.created) - 5} textAnchor="middle" fontSize="10" fill="#059669" fontWeight="600">{b.created}</text>
                  )}
                  <rect
                    x={padL + i * step}
                    y={padT - 6}
                    width={step}
                    height={plotH + 6}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHover(i)}
                    onClick={() => setSelected(isSel ? null : b.key)}
                  />
                </g>
              );
            })}
          </svg>

          {hoverBucket && hover !== null && (
            <div
              className="pointer-events-none absolute top-1 z-10 min-w-[150px] rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-xl"
              style={{ left: `${(cx(hover) / W) * 100}%`, transform: `translateX(${hover > buckets.length / 2 ? "-108%" : "8%"})` }}
            >
              <div className="font-semibold text-slate-900 mb-1.5">{bucketLabel(hoverBucket)}</div>
              <div className="flex items-center justify-between gap-4 text-slate-600">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: IND }} /> Responses</span>
                <span className="font-semibold text-slate-900 tabular-nums">{hoverBucket.responses}</span>
              </div>
              <div className="flex items-center justify-between gap-4 text-slate-600 mt-0.5">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: EMR }} /> Created</span>
                <span className="font-semibold text-slate-900 tabular-nums">{hoverBucket.created}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selected bucket */}
      {selBucket && detail && (
        <div className="rounded-xl border border-indigo-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 bg-indigo-50/60 border-b border-indigo-100">
            <div>
              <h3 className="text-base font-semibold text-slate-900">{bucketLabel(selBucket)}</h3>
              <p className="text-xs text-slate-500">
                {selBucket.created} created · {selBucket.responses} responses
              </p>
            </div>
            <button onClick={() => setSelected(null)} className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-white" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          {detail.created.length === 0 && detail.responses.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-400">No activity in this period.</div>
          ) : (
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
              <div className="p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Forms created</div>
                {detail.created.length === 0 ? (
                  <p className="text-sm text-slate-400">None</p>
                ) : (
                  <ul className="space-y-1">
                    {detail.created.map((c) => (
                      <li key={c.id}>
                        <button
                          onClick={() => router.push(`/rfi/${c.id}`)}
                          className="w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                        >
                          <span className="truncate">{c.subject}</span>
                          <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Responses received</div>
                  {detail.responses.length > 0 && (
                    <button onClick={() => onOpenResponses("", selBucket.start, selBucket.end)} className="text-xs font-medium text-primary hover:underline">
                      View all
                    </button>
                  )}
                </div>
                {detail.responses.length === 0 ? (
                  <p className="text-sm text-slate-400">None</p>
                ) : (
                  <ul className="space-y-1">
                    {detail.responses.map((r) => (
                      <li key={r.rfi_id}>
                        <button
                          onClick={() => onOpenResponses(r.rfi_id, selBucket.start, selBucket.end)}
                          className="w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                        >
                          <span className="truncate">{r.subject}</span>
                          <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 tabular-nums">{r.count}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top forms */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Trophy className="h-4 w-4 text-amber-500" /> Top forms
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">Most responses in the last {range} days · click a form to read them</p>
          </div>
        </div>
        {!data ? (
          <div className="py-8 text-center text-sm text-slate-400">Loading…</div>
        ) : topForms.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">No responses in this period yet.</div>
        ) : (
          <ul className="space-y-2.5">
            {topForms.map((f, i) => (
              <li key={f.id}>
                <button
                  onClick={() => onOpenResponses(f.id, "", "")}
                  className="group w-full flex items-center gap-4 text-left"
                >
                  <span className="w-5 text-sm font-medium text-slate-400 tabular-nums">{i + 1}</span>
                  <span className="w-48 sm:w-64 truncate text-sm text-slate-800 group-hover:text-primary">{f.subject}</span>
                  <span className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <span
                      className="block h-full rounded-full transition-all"
                      style={{ width: `${Math.max(3, (f.count / topMax) * 100)}%`, background: i === 0 ? IND : "#a5b4fc" }}
                    />
                  </span>
                  <span className="w-10 text-right text-sm font-semibold text-slate-900 tabular-nums">{f.count}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
