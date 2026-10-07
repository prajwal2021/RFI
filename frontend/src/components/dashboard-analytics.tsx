"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { FileText, Globe, Inbox, TrendingUp, X, ArrowUpRight, Flame, CalendarDays } from "lucide-react";
import { Analytics, AnalyticsDay, fetchAnalytics } from "@/lib/api";

const RANGES = [30, 90, 180] as const;
const RESP_COLORS = ["#eef2ff", "#c7d2fe", "#a5b4fc", "#6366f1", "#4338ca"];
const CREATED_COLORS = ["#ecfdf5", "#a7f3d0", "#6ee7b7", "#10b981", "#047857"];
const IND = "#6366f1";
const EMR = "#10b981";

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parse(date: string): Date {
  return new Date(`${date}T12:00:00`);
}

/** Monotone cubic interpolation (no overshoot below zero), returned as an SVG path. */
function smoothPath(pts: { x: number; y: number }[]): string {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M${pts[0].x},${pts[0].y}`;
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1].x - pts[i].x);
    m.push((pts[i + 1].y - pts[i].y) / dx[i]);
  }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2);
  t.push(m[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
    } else {
      const a = t[i] / m[i];
      const b = t[i + 1] / m[i];
      const s = a * a + b * b;
      if (s > 9) {
        const k = 3 / Math.sqrt(s);
        t[i] = k * a * m[i];
        t[i + 1] = k * b * m[i];
      }
    }
  }
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${(pts[i].x + h).toFixed(1)},${(pts[i].y + t[i] * h).toFixed(1)} ${(pts[i + 1].x - h).toFixed(1)},${(pts[i + 1].y - t[i + 1] * h).toFixed(1)} ${pts[i + 1].x.toFixed(1)},${pts[i + 1].y.toFixed(1)}`;
  }
  return d;
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
  onOpenResponses: (rfiId: string, date: string) => void;
}) {
  const router = useRouter();
  const [range, setRange] = useState<(typeof RANGES)[number]>(90);
  const [metric, setMetric] = useState<"responses" | "created">("responses");
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [showResp, setShowResp] = useState(true);
  const [showCreated, setShowCreated] = useState(true);

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
  const today = dates[dates.length - 1];

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
  const peak = series.reduce((best, s) => (s.responses > best.responses ? s : best), series[0] || { date: "", responses: 0, created: 0 });
  const avg = range ? sumResponses / range : 0;

  const maxY = Math.max(1, ...series.map((s) => Math.max(showResp ? s.responses : 0, showCreated ? s.created : 0)));
  const niceMax = maxY <= 4 ? 4 : Math.ceil(maxY / 4) * 4;

  // ── trend chart geometry ──
  const W = 1000;
  const H = 300;
  const padL = 40;
  const padR = 16;
  const padT = 16;
  const padB = 30;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const step = plotW / series.length;
  const x = (i: number) => padL + (i + 0.5) * step;
  const y = (v: number) => padT + plotH - (v / niceMax) * plotH;
  const respPts = series.map((s, i) => ({ x: x(i), y: y(s.responses) }));
  const respLine = smoothPath(respPts);
  const respArea = `${respLine} L${x(series.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
  const barW = Math.max(2, Math.min(18, step * 0.55));
  const tickEvery = Math.ceil(series.length / 8);

  // ── heatmap geometry ──
  const startDow = dates.length ? parse(dates[0]).getDay() : 0;
  const cells: (string | null)[] = [...Array(startDow).fill(null), ...dates];
  const weeks = Math.ceil(cells.length / 7);
  const heatMax = Math.max(1, ...series.map((s) => s[metric]));
  const colors = metric === "responses" ? RESP_COLORS : CREATED_COLORS;
  const level = (v: number) => (v === 0 ? 0 : Math.min(4, Math.ceil((4 * v) / heatMax)));
  const cellH = weeks <= 15 ? 36 : weeks <= 20 ? 30 : 24;
  const showNumbers = weeks <= 20;
  const GAP = 4;
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
          hint={data ? `${avg.toFixed(1)} per day on average` : undefined}
        />
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Activity */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Activity</h3>
            <p className="text-sm text-slate-500 mt-0.5">Click any day for details.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowResp(!showResp)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition ${showResp ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-400 line-through"}`}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: IND }} /> Responded · {sumResponses}
            </button>
            <button
              onClick={() => setShowCreated(!showCreated)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition ${showCreated ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-400 line-through"}`}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: EMR }} /> Created · {sumCreated}
            </button>
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
            <defs>
              <linearGradient id="gResp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={IND} stopOpacity="0.32" />
                <stop offset="100%" stopColor={IND} stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="gBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={EMR} stopOpacity="0.95" />
                <stop offset="100%" stopColor={EMR} stopOpacity="0.55" />
              </linearGradient>
            </defs>

            {[0, 1, 2, 3, 4].map((i) => {
              const v = (niceMax / 4) * i;
              return (
                <g key={i}>
                  <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke={i === 0 ? "#cbd5e1" : "#eef2f7"} />
                  <text x={padL - 10} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#94a3b8">
                    {Math.round(v)}
                  </text>
                </g>
              );
            })}

            {series.map((s, i) =>
              i % tickEvery === 0 || i === series.length - 1 ? (
                <text key={s.date} x={x(i)} y={H - 8} textAnchor={i === series.length - 1 ? "end" : "middle"} fontSize="11" fill="#94a3b8">
                  {s.date === today ? "Today" : format(parse(s.date), "MMM d")}
                </text>
              ) : null
            )}

            {selected && (() => {
              const i = dates.indexOf(selected);
              return i >= 0 ? <rect x={padL + i * step} y={padT} width={step} height={plotH} fill={IND} opacity="0.10" rx="3" /> : null;
            })()}

            {showCreated &&
              series.map((s, i) =>
                s.created > 0 ? (
                  <rect key={s.date} x={x(i) - barW / 2} y={y(s.created)} width={barW} height={y(0) - y(s.created)} rx="3" fill="url(#gBar)" />
                ) : null
              )}

            {showResp && (
              <>
                <path d={respArea} fill="url(#gResp)" />
                <path d={respLine} fill="none" stroke={IND} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {series.map((s, i) =>
                  s.responses > 0 ? <circle key={s.date} cx={x(i)} cy={y(s.responses)} r="3" fill="#fff" stroke={IND} strokeWidth="2" /> : null
                )}
              </>
            )}

            {hover !== null && (
              <>
                <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + plotH} stroke="#94a3b8" strokeDasharray="3 3" />
                {showResp && <circle cx={x(hover)} cy={y(series[hover].responses)} r="5.5" fill={IND} stroke="#fff" strokeWidth="2.5" />}
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
              className="pointer-events-none absolute top-1 z-10 min-w-[150px] rounded-xl border border-slate-200 bg-white/95 backdrop-blur px-3.5 py-2.5 text-xs shadow-xl"
              style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > series.length / 2 ? "-108%" : "8%"})` }}
            >
              <div className="font-semibold text-slate-900 mb-1.5">{format(parse(hoverSeries.date), "EEE, MMM d")}</div>
              <div className="flex items-center justify-between gap-4 text-slate-600">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: IND }} /> Responded</span>
                <span className="font-semibold text-slate-900 tabular-nums">{hoverSeries.responses}</span>
              </div>
              <div className="flex items-center justify-between gap-4 text-slate-600 mt-0.5">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: EMR }} /> Created</span>
                <span className="font-semibold text-slate-900 tabular-nums">{hoverSeries.created}</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t border-slate-100 pt-4 text-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <Flame className="h-4 w-4 text-amber-500" />
            Busiest day:{" "}
            <span className="font-medium text-slate-900">
              {peak && peak.responses > 0 ? `${format(parse(peak.date), "MMM d")} (${peak.responses})` : "—"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <CalendarDays className="h-4 w-4 text-indigo-500" />
            Active days:{" "}
            <span className="font-medium text-slate-900">{series.filter((s) => s.responses > 0 || s.created > 0).length} of {range}</span>
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Heatmap</h3>
            <p className="text-sm text-slate-500 mt-0.5">Daily {metric === "responses" ? "responses received" : "forms created"} · last {range} days</p>
          </div>
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            {(["responses", "created"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`px-3 py-1 text-xs font-medium rounded-md ${metric === m ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-800"}`}
              >
                {m === "responses" ? "Responded" : "Created"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          {/* weekday labels */}
          <div className="shrink-0 pt-[22px] text-[11px] text-slate-400" style={{ display: "grid", gridTemplateRows: `repeat(7, ${cellH}px)`, gap: GAP }}>
            {["", "Mon", "", "Wed", "", "Fri", ""].map((l, i) => (
              <div key={i} className="flex items-center justify-end pr-1">{l}</div>
            ))}
          </div>

          <div className="flex-1 min-w-0">
            {/* month labels */}
            <div className="h-[18px] mb-1 grid text-[11px] text-slate-400" style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))`, columnGap: GAP }}>
              {monthLabels.map((m) => (
                <span key={m.col} style={{ gridColumn: `${m.col + 1} / span 3` }} className="whitespace-nowrap">
                  {m.label}
                </span>
              ))}
            </div>
            {/* cells fill the full card width */}
            <div
              className="grid"
              style={{
                gridAutoFlow: "column",
                gridTemplateRows: `repeat(7, ${cellH}px)`,
                gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))`,
                gap: GAP,
              }}
            >
              {cells.map((d, idx) => {
                if (!d) return <div key={`pad-${idx}`} />;
                const v = byDate.get(d)?.[metric === "responses" ? "responses_count" : "created_count"] || 0;
                const lv = level(v);
                return (
                  <button
                    key={d}
                    onClick={() => setSelected(d === selected ? null : d)}
                    title={`${v} ${metric === "responses" ? "response" : "form"}${v === 1 ? "" : "s"} · ${format(parse(d), "EEE, MMM d, yyyy")}`}
                    className={`w-full h-full rounded-md flex items-center justify-center text-[11px] font-medium transition-all hover:brightness-95 hover:scale-[1.06] focus:outline-none ${
                      selected === d ? "ring-2 ring-slate-900 ring-offset-1" : d === today ? "ring-1 ring-slate-400" : ""
                    }`}
                    style={{ backgroundColor: colors[lv], color: lv >= 3 ? "#fff" : "#475569" }}
                    aria-label={`${format(parse(d), "MMM d")}: ${v}`}
                  >
                    {showNumbers && v > 0 ? v : ""}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400">
          <span>Ring marks today</span>
          <span className="flex items-center gap-1.5">
            Less
            {colors.map((c) => (
              <span key={c} className="h-3 w-3 rounded-[4px] border border-slate-200" style={{ backgroundColor: c }} />
            ))}
            More
          </span>
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
