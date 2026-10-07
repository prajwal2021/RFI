"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ClipboardList, ListChecks, Plus, Sparkles } from "lucide-react";

const OPTIONS = [
  {
    path: "/forms/new",
    title: "SS Form",
    desc: "Smartsheet-style form builder",
    icon: <ClipboardList className="h-4 w-4 text-indigo-600" />,
    tint: "bg-indigo-50",
  },
  {
    path: "/surveyjs/new",
    title: "SurveyJS",
    desc: "SurveyJS Creator",
    icon: <ListChecks className="h-4 w-4 text-emerald-600" />,
    tint: "bg-emerald-50",
  },
  {
    path: "/surveyjs-clone/new",
    title: "SurveyJS Clone",
    desc: "Built-in designer with themes & logic",
    icon: <Sparkles className="h-4 w-4 text-teal-600" />,
    tint: "bg-teal-50",
  },
];

export default function NewFormMenu({ workspaceId }: { workspaceId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 h-9 pl-3 pr-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        <Plus className="h-4 w-4" /> New form <ChevronDown className="h-4 w-4 opacity-80" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 bg-white shadow-lg z-40 p-1.5">
          {OPTIONS.map((o) => (
            <button
              key={o.path}
              onClick={() => {
                setOpen(false);
                router.push(workspaceId ? `${o.path}?workspace=${workspaceId}` : o.path);
              }}
              className="w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-slate-50"
            >
              <span className={`h-8 w-8 rounded-lg flex items-center justify-center ${o.tint}`}>{o.icon}</span>
              <span>
                <span className="block text-sm font-medium text-slate-900">{o.title}</span>
                <span className="block text-xs text-slate-500">{o.desc}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
