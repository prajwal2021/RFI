"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { FileText, Globe, Inbox, TrendingUp, X, ArrowUpRight } from "lucide-react";
import { Analytics, AnalyticsDay, fetchAnalytics } from "@/lib/api";

const RANGES = [30, 90, 180] as const;
const RESP_COLORS = ["#f1f5f9", "#c7d2fe", "#a5b4fc", "#6366f1", "#4338ca"];
const CREATED_COLORS = ["#f1f5f9", "#a7f3d0", "#6ee7b7", "#10b981", "#047857"];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parse(date: string): Date {
  return new Date(`${date}T12:00:00`);
}

function Kpi({ icon, label, value, tint }: { icon: React.ReactNode; label: string; value: number | string; tint: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span className={`h-9 w-9 rounded-lg flex items-center justify-center ${tint}`}>{icon}</span>
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">{value}</div>
    </div>
  );
}

export default function DashboardAnalytics({
  onOpenResponses,
}: {
  onOpenResponses: (rfiId: string, date: string) => void;
}) {
  const router = useRouter();
  const [range, setRange] = useState<(typeof RANGES)[number]>(90);
  const [metric, setMetric] = useState<"responses" | "created">("responses");
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    setData(null);
    setError(null);
    fetchAnalytics(range)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load analytics"));
  }, [range]);

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

  const byDate = useMemo(() => {
    const m = new Map<string, AnalyticsDay>();
    data?.days.forEach((d) => m.set(d.date, d));
    return m;
  }, [data]);

  const series = useMemo(
    () =>
      dates.map((d) => ({
        date: d,
        created: byDate.get(d)?.created_count || 0,
        responses: byDate.get(d)?.responses_count || 0,
      })),
    [dates, byDate]
  );

  const sumCreated = series.reduce((a, s) => a + s.created, 0);
  const sumResponses = series.reduce((a, s) => a + s.responses, 0);
  const maxY = Math.max(1, ...series.map((s) => Math.max(s.created, s.responses)));
  const niceMax = maxY <= 4 ? 4 : Math.ceil(maxY / 4) * 4;

  // ── trend chart geometry ──
  const W = 860;
  const H = 240;
  const padL = 36;
  const padR = 12;
  const padT = 12;
  const padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const step = plotW / series.length;
  const x = (i: number) => padL + (i + 0.5) * step;
  const y = (v: number) => padT + plotH - (v / niceMax) * plotH;
  const line = (key: "created" | "responses") =>
    series.map((s, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(s[key]).toFixed(1)}`).join(" ");
  const area = (key: "created" | "responses") =>
    `${line(key)} L${x(series.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
  const tickEvery = Math.ceil(series.length / 7);

  // ── heatmap geometry ──
  const startDow = dates.length ? parse(dates[0]).getDay() : 0;
  const cells: (string | null)[] = [...Array(startDow).fill(null), ...dates];
  const weeks = Math.ceil(cells.length / 7);
  const heatMax = Math.max(1, ...series.map((s) => s[metric]));
  const colors = metric === "responses" ? RESP_COLORS : CREATED_COLORS;
  const level = (v: number) => (v === 0 ? 0 : Math.min(4, Math.ceil((4 * v) / heatMax)));
  const monthLabels: { col: number; label: string }[] = [];
  let lastMonth = -1;
  cells.forEach((d, idx) => {
    if (!d) return;
    const dt = parse(d);
    if (dt.getMonth() !== lastMonth && idx % 7 === 0) {
      monthLabels.push({ col: Math.floor(idx / 7), label: format(dt, "MMM") });
      lastMonth = dt.getMonth();
    }
  });

  const selDay = selected ? byDate.get(selected) : undefined;
  const hoverSeries = hover !== null ? series[hover] : null;

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
        />
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Trend */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Activity</h3>
            <p className="text-sm text-slate-500">
              {sumCreated} created · {sumResponses} responded — click a day for details
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-indigo-500" /> Responded</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Created</span>
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
                  <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeDasharray={i === 0 ? undefined : "3 4"} />
                  <text x={padL - 8} y={y(v) + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{Math.round(v)}</text>
                </g>
              );
            })}
            {series.map((s, i) =>
              i % tickEvery === 0 ? (
                <text key={s.date} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#94a3b8">
                  {format(parse(s.date), "MMM d")}
                </text>
              ) : null
            )}

            <path d={area("created")} fill="#10b981" opacity="0.10" />
            <path d={area("responses")} fill="#6366f1" opacity="0.12" />
            <path d={line("created")} fill="none" stroke="#10b981" strokeWidth="2" strokeLinejoin="round" />
            <path d={line("responses")} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinejoin="round" />

            {selected && (() => {
              const i = dates.indexOf(selected);
              return i >= 0 ? <rect x={padL + i * step} y={padT} width={step} height={plotH} fill="#6366f1" opacity="0.12" /> : null;
            })()}
            {hover !== null && (
              <>
                <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + plotH} stroke="#94a3b8" strokeDasharray="3 3" />
                <circle cx={x(hover)} cy={y(series[hover].responses)} r="4" fill="#6366f1" stroke="#fff" strokeWidth="2" />
                <circle cx={x(hover)} cy={y(series[hover].created)} r="4" fill="#10b981" stroke="#fff" strokeWidth="2" />
              </>
            )}

            {series.map((s, i) => (
              <rect
                key={s.date}
                x={padL + i * step}
                y={padT}
                width={step}
                height={plotH}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHover(i)}
                onClick={() => setSelected(s.date === selected ? null : s.date)}
              />
            ))}
          </svg>

          {hoverSeries && hover !== null && (
            <div
              className="pointer-events-none absolute top-2 z-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
              style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > series.length / 2 ? "-105%" : "5%"})` }}
            >
              <div className="font-medium text-slate-900 mb-1">{format(parse(hoverSeries.date), "EEE, MMM d")}</div>
              <div className="flex items-center gap-1.5 text-slate-600"><span className="h-2 w-2 rounded-full bg-indigo-500" /> {hoverSeries.responses} responded</div>
              <div className="flex items-center gap-1.5 text-slate-600"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {hoverSeries.created} created</div>
            </div>
          )}
        </div>
      </div>

      {/* Heatmap */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Heatmap</h3>
            <p className="text-sm text-slate-500">Daily {metric === "responses" ? "responses received" : "forms created"}</p>
          </div>
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            {(["responses", "created"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`px-3 py-1 text-xs font-medium rounded-md capitalize ${metric === m ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-800"}`}
              >
                {m === "responses" ? "Responded" : "Created"}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="inline-block">
            <div className="relative h-4 mb-1 text-[10px] text-slate-400" style={{ width: weeks * 16 }}>
              {monthLabels.map((m) => (
                <span key={m.col} className="absolute" style={{ left: m.col * 16 }}>{m.label}</span>
              ))}
            </div>
            <div className="grid gap-[3px]" style={{ gridAutoFlow: "column", gridTemplateRows: "repeat(7, 13px)", gridAutoColumns: "13px" }}>
              {cells.map((d, idx) => {
                if (!d) return <div key={`pad-${idx}`} />;
                const v = byDate.get(d)?.[metric === "responses" ? "responses_count" : "created_count"] || 0;
                return (
                  <button
                    key={d}
                    onClick={() => setSelected(d === selected ? null : d)}
                    title={`${v} ${metric === "responses" ? "response" : "form"}${v === 1 ? "" : "s"} · ${format(parse(d), "EEE, MMM d, yyyy")}`}
                    className={`h-[13px] w-[13px] rounded-[3px] transition-transform hover:scale-125 focus:outline-none ${selected === d ? "ring-2 ring-slate-900 ring-offset-1" : ""}`}
                    style={{ backgroundColor: colors[level(v)] }}
                    aria-label={`${format(parse(d), "MMM d")}: ${v}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-slate-400">
          Less
          {colors.map((c) => (
            <span key={c} className="h-[11px] w-[11px] rounded-[3px]" style={{ backgroundColor: c }} />
          ))}
          More
        </div>
      </div>

      {/* Selected day */}
      {selected && (
        <div className="rounded-xl border border-indigo-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 bg-indigo-50/60 border-b border-indigo-100">
            <div>
              <h3 className="text-base font-semibold text-slate-900">{format(parse(selected), "EEEE, MMMM d, yyyy")}</h3>
              <p className="text-xs text-slate-500">
                {selDay?.created_count || 0} created · {selDay?.responses_count || 0} responses
              </p>
            </div>
            <button onClick={() => setSelected(null)} className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-white" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          {!selDay ? (
            <div className="px-5 py-8 text-center text-sm text-slate-400">No activity on this day.</div>
          ) : (
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
              <div className="p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Forms created</div>
                {selDay.created.length === 0 ? (
                  <p className="text-sm text-slate-400">None</p>
                ) : (
                  <ul className="space-y-1">
                    {selDay.created.map((c) => (
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
                  {selDay.responses.length > 0 && (
                    <button onClick={() => onOpenResponses("", selected)} className="text-xs font-medium text-primary hover:underline">
                      View all
                    </button>
                  )}
                </div>
                {selDay.responses.length === 0 ? (
                  <p className="text-sm text-slate-400">None</p>
                ) : (
                  <ul className="space-y-1">
                    {selDay.responses.map((r) => (
                      <li key={r.rfi_id}>
                        <button
                          onClick={() => onOpenResponses(r.rfi_id, selected)}
                          className="w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                        >
                          <span className="truncate">{r.subject}</span>
                          <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 tabular-nums">
                            {r.count}
                          </span>
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
    </div>
  );
}
