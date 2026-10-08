"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek,
  subDays,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

export interface DateRange {
  from: string;
  to: string;
}

function ymd(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function parse(s: string): Date {
  return new Date(`${s}T12:00:00`);
}

function label(r: DateRange | null): string {
  if (!r) return "Any date";
  if (r.from === r.to) return format(parse(r.from), "MMM d, yyyy");
  return `${format(parse(r.from), "MMM d")} – ${format(parse(r.to), "MMM d, yyyy")}`;
}

function Month({
  month, lo, hi, today, counts, maxCount,
}: {
  month: Date;
  lo: string | null;
  hi: string | null;
  today: string;
  counts: Record<string, number>;
  maxCount: number;
}) {
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) });
  return (
    <div className="w-[252px]">
      <div className="text-center text-sm font-semibold text-slate-900 mb-2">{format(month, "MMMM yyyy")}</div>
      <div className="grid grid-cols-7 text-center text-[11px] text-slate-400 mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const key = ymd(d);
          const inMonth = isSameMonth(d, month);
          if (!inMonth) return <div key={key} />;
          const inRange = lo !== null && hi !== null && key >= lo && key <= hi;
          const isEdge = key === lo || key === hi;
          const count = counts[key] || 0;
          const tint = count > 0 && !inRange ? (count / maxCount > 0.5 ? "bg-indigo-200" : "bg-indigo-100") : "";
          return (
            <div key={key} className={`p-px ${inRange && !isEdge ? "bg-indigo-100" : ""} ${key === lo && hi !== lo ? "rounded-l-lg bg-indigo-100" : ""} ${key === hi && hi !== lo ? "rounded-r-lg bg-indigo-100" : ""}`}>
              <button
                type="button"
                data-date={key}
                title={count ? `${count} response${count === 1 ? "" : "s"}` : undefined}
                className={`relative w-full aspect-square rounded-lg text-xs flex items-center justify-center select-none touch-none ${
                  isEdge ? "bg-primary text-primary-foreground font-semibold" : `${tint} ${count ? "font-semibold text-slate-900" : "text-slate-600"} hover:bg-slate-100`
                } ${key === today && !isEdge ? "ring-1 ring-slate-400" : ""}`}
              >
                {d.getDate()}
                {count > 0 && isEdge && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-white/80" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DateRangePicker({
  value,
  onChange,
  counts,
}: {
  value: DateRange | null;
  onChange: (r: DateRange | null) => void;
  counts: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => startOfMonth(value ? parse(value.from) : addMonths(new Date(), -1)));
  const [anchor, setAnchor] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const dragging = useRef(false);
  const anchorRef = useRef<string | null>(null);
  const endRef = useRef<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const today = ymd(new Date());
  // Show the month before the current one by default so a drag can span two months.
  const left = view;
  const right = addMonths(view, 1);

  const live = anchor && end ? [anchor, end].sort() : null;
  const lo = live ? live[0] : value ? value.from : null;
  const hi = live ? live[1] : value ? value.to : null;

  const maxCount = useMemo(() => Math.max(1, ...Object.values(counts)), [counts]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    const finish = () => {
      if (!dragging.current) return;
      dragging.current = false;
      const a = anchorRef.current;
      const e = endRef.current;
      anchorRef.current = null;
      endRef.current = null;
      setAnchor(null);
      setEnd(null);
      if (a && e) {
        const [from, to] = [a, e].sort();
        onChange({ from, to });
        setOpen(false);
      }
    };
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    return () => {
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  }, [onChange]);

  const dateAt = (x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y)?.closest("[data-date]") as HTMLElement | null;
    return el?.dataset.date || null;
  };

  const preset = (from: Date, to: Date) => {
    onChange({ from: ymd(from), to: ymd(to) });
    setOpen(false);
  };
  const now = new Date();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          if (!open) setView(startOfMonth(value ? parse(value.from) : addMonths(new Date(), -1)));
          setOpen(!open);
        }}
        className={`inline-flex items-center gap-2 h-10 px-3 rounded-md border text-sm w-full md:w-auto ${value ? "border-indigo-300 bg-indigo-50 text-indigo-800" : "border-input bg-background text-slate-700 hover:bg-slate-50"}`}
      >
        <CalendarDays className="h-4 w-4 shrink-0" />
        <span className="truncate">{label(value)}</span>
        {value && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear date filter"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="rounded-full p-0.5 hover:bg-indigo-100"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 md:left-0 mt-2 z-40 rounded-xl border border-slate-200 bg-white shadow-xl p-4 max-w-[95vw] overflow-x-auto">
          <div className="flex gap-4">
            <div className="hidden sm:flex flex-col gap-1 pr-4 border-r border-slate-100 w-32 shrink-0">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Quick select</div>
              {[
                { l: "Today", f: () => preset(now, now) },
                { l: "Yesterday", f: () => preset(subDays(now, 1), subDays(now, 1)) },
                { l: "Last 7 days", f: () => preset(subDays(now, 6), now) },
                { l: "Last 30 days", f: () => preset(subDays(now, 29), now) },
                { l: "This month", f: () => preset(startOfMonth(now), now) },
                { l: "Last month", f: () => preset(startOfMonth(addMonths(now, -1)), endOfMonth(addMonths(now, -1))) },
              ].map((p) => (
                <button key={p.l} type="button" onClick={p.f} className="text-left text-sm text-slate-700 rounded-md px-2 py-1.5 hover:bg-slate-100">
                  {p.l}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="mt-1 text-left text-sm text-slate-500 rounded-md px-2 py-1.5 hover:bg-slate-100"
              >
                Any date
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <button type="button" onClick={() => setView(addMonths(view, -1))} className="p-1.5 rounded-md hover:bg-slate-100" aria-label="Previous month">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs text-slate-400">Drag across days to select a range</span>
                <button type="button" onClick={() => setView(addMonths(view, 1))} className="p-1.5 rounded-md hover:bg-slate-100" aria-label="Next month">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div
                className="flex gap-6 touch-none"
                onPointerDown={(e) => {
                  const d = dateAt(e.clientX, e.clientY);
                  if (!d) return;
                  e.preventDefault();
                  dragging.current = true;
                  anchorRef.current = d;
                  endRef.current = d;
                  setAnchor(d);
                  setEnd(d);
                }}
                onPointerMove={(e) => {
                  if (!dragging.current) return;
                  const d = dateAt(e.clientX, e.clientY);
                  if (d && d !== endRef.current) {
                    endRef.current = d;
                    setEnd(d);
                  }
                }}
              >
                <Month month={left} lo={lo} hi={hi} today={today} counts={counts} maxCount={maxCount} />
                <Month month={right} lo={lo} hi={hi} today={today} counts={counts} maxCount={maxCount} />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded bg-indigo-100 border border-indigo-200" /> Days with responses
                </span>
                <span>{lo && hi ? (lo === hi ? format(parse(lo), "MMM d, yyyy") : `${format(parse(lo), "MMM d")} – ${format(parse(hi), "MMM d, yyyy")}`) : "No range selected"}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

