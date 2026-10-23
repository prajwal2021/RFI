"use client";

import { useEffect, useState } from "react";
import { Check, Info, X } from "lucide-react";
import { fetchMeta, JOURNEY_STYLE, Meta, Opt } from "@/lib/crm";

// Salesforce Lightning-like tokens
export const BRAND = "#0176d3";
export const btn = {
  brand: "inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded border border-[#0176d3] bg-[#0176d3] text-white text-[13px] font-medium hover:bg-[#014486] hover:border-[#014486] disabled:opacity-50 disabled:cursor-not-allowed",
  neutral: "inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded border border-[#c9c9c9] bg-white text-[#0176d3] text-[13px] font-medium hover:bg-[#f3f3f3] disabled:opacity-50 disabled:cursor-not-allowed",
  danger: "inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded border border-[#ba0517] bg-white text-[#ba0517] text-[13px] font-medium hover:bg-red-50 disabled:opacity-50",
  icon: "inline-flex items-center justify-center h-8 w-8 rounded border border-[#c9c9c9] bg-white text-[#747474] hover:bg-[#f3f3f3]",
};
export const input =
  "w-full h-8 px-2.5 rounded border border-[#c9c9c9] bg-white text-[13px] text-[#181818] focus:outline-none focus:border-[#0176d3] focus:ring-1 focus:ring-[#0176d3] disabled:bg-[#f3f3f3]";
export const textarea =
  "w-full px-2.5 py-1.5 rounded border border-[#c9c9c9] bg-white text-[13px] text-[#181818] focus:outline-none focus:border-[#0176d3] focus:ring-1 focus:ring-[#0176d3] resize-y";

export function useMeta(): { meta: Meta | null; error: string | null; reload: () => void } {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = (force = false) =>
    fetchMeta(force)
      .then(setMeta)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  useEffect(() => {
    load();
  }, []);
  return { meta, error, reload: () => load(true) };
}

/** Small (i) icon that shows a plain-language description on hover. */
export function HelpTip({ text, className = "" }: { text: string | null | undefined; className?: string }) {
  if (!text) return null;
  return (
    <span className={`relative inline-flex group align-middle ${className}`} tabIndex={0}>
      <Info className="h-3.5 w-3.5 text-[#747474] cursor-help" />
      <span className="pointer-events-none absolute left-1/2 bottom-full mb-1.5 -translate-x-1/2 z-50 w-64 rounded bg-[#032d60] px-2.5 py-1.5 text-[12px] leading-snug font-normal normal-case tracking-normal text-white shadow-lg opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition">
        {text}
      </span>
    </span>
  );
}

export function JourneyBadge({ value, label, help }: { value: string | null | undefined; label?: string | null; help?: string | null }) {
  if (!value) return null;
  return (
    <span title={help || undefined} className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${JOURNEY_STYLE[value] || JOURNEY_STYLE.new}`}>
      {label || value}
    </span>
  );
}

export function IconTile({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="h-8 w-8 rounded flex items-center justify-center text-white shrink-0" style={{ background: color }}>
      {children}
    </span>
  );
}

export function Card({
  title, icon, iconColor = BRAND, actions, children, help, className = "", bodyClass = "p-4",
}: {
  title: React.ReactNode; icon?: React.ReactNode; iconColor?: string; actions?: React.ReactNode; children: React.ReactNode;
  help?: string; className?: string; bodyClass?: string;
}) {
  return (
    <section className={`rounded border border-[#dddbda] bg-white shadow-[0_2px_2px_0_rgba(0,0,0,0.06)] ${className}`}>
      <header className="flex items-center gap-2.5 px-4 py-2.5 border-b border-[#e5e5e5]">
        {icon && <IconTile color={iconColor}>{icon}</IconTile>}
        <h2 className="text-[14px] font-bold text-[#181818] flex items-center gap-1.5 flex-1 min-w-0">
          <span className="truncate">{title}</span>
          <HelpTip text={help} />
        </h2>
        {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
      </header>
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

export function FieldLabel({ label, help, required }: { label: string; help?: string; required?: boolean }) {
  return (
    <span className="flex items-center gap-1 text-[12px] text-[#444] mb-1">
      {required && <span className="text-[#ba0517]">*</span>}
      {label}
      <HelpTip text={help} />
    </span>
  );
}

/** A select whose options carry descriptions; the chosen option's description shows underneath. */
export function OptSelect({
  label, opts, value, onChange, help, allowEmpty, emptyLabel = "—", required,
}: {
  label?: string; opts: Opt[]; value: string; onChange: (v: string) => void; help?: string; allowEmpty?: boolean; emptyLabel?: string; required?: boolean;
}) {
  const current = opts.find((o) => o.value === value);
  return (
    <label className="block">
      {label && <FieldLabel label={label} help={help} required={required} />}
      <select value={value} onChange={(e) => onChange(e.target.value)} className={input}>
        {allowEmpty && <option value="">{emptyLabel}</option>}
        {opts.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {current?.description && <span className="block mt-0.5 text-[11px] text-[#747474] leading-snug">{current.description}</span>}
    </label>
  );
}

export function Modal({
  title, onClose, children, footer, wide,
}: {
  title: React.ReactNode; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center bg-[rgba(8,7,7,0.6)] p-4 overflow-y-auto" onMouseDown={onClose}>
      <div className={`w-full ${wide ? "max-w-3xl" : "max-w-xl"} rounded bg-white shadow-2xl my-8`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="relative px-6 py-4 border-b border-[#e5e5e5] text-center">
          <h2 className="text-[18px] font-normal text-[#181818]">{title}</h2>
          <button onClick={onClose} className="absolute right-3 top-3 text-[#747474] hover:text-[#181818]" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && <div className="px-6 py-3 border-t border-[#e5e5e5] bg-[#f3f3f3] flex justify-end gap-2 rounded-b">{footer}</div>}
      </div>
    </div>
  );
}

/** Salesforce-style "Path": chevrons for each stage; click to move. */
export function Path({
  stages, value, onChange, disabled,
}: {
  stages: Opt[]; value: string; onChange?: (v: string) => void; disabled?: boolean;
}) {
  const idx = stages.findIndex((s) => s.value === value);
  return (
    <div className="flex w-full overflow-x-auto">
      {stages.map((s, i) => {
        const done = i < idx && value !== "lost";
        const cur = i === idx;
        const lost = s.value === "lost" && cur;
        const bg = lost ? "#ba0517" : cur ? "#014486" : done ? "#2e844a" : "#ecebea";
        const fg = cur || done || lost ? "#fff" : "#181818";
        return (
          <button
            key={s.value}
            type="button"
            title={s.description}
            disabled={disabled || !onChange}
            onClick={() => onChange && s.value !== value && onChange(s.value)}
            className="relative h-8 flex-1 min-w-[84px] text-[12px] font-medium px-4 -ml-2 first:ml-0 disabled:cursor-default hover:brightness-95"
            style={{
              background: bg, color: fg,
              clipPath: i === 0 ? "polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)"
                : "polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%, 10px 50%)",
              borderRadius: i === 0 ? "16px 0 0 16px" : undefined,
            }}
          >
            <span className="inline-flex items-center gap-1">
              {done && <Check className="h-3.5 w-3.5" />}
              {s.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function Toast({ text, onDone }: { text: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[70] rounded bg-[#2e844a] text-white text-[13px] px-4 py-2.5 shadow-lg flex items-center gap-2">
      <Check className="h-4 w-4" /> {text}
    </div>
  );
}

export function ErrorBox({ text }: { text: string | null }) {
  if (!text) return null;
  return <div className="rounded border border-[#ba0517] bg-[#fef1ee] px-3 py-2 text-[13px] text-[#ba0517]">{text}</div>;
}

export function Empty({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <div className="py-8 text-center text-[13px] text-[#747474]">
      <p>{text}</p>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
