"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { FileQuestion } from "lucide-react";
import type { RFI } from "@/lib/api";

const SurveyRunner = dynamic(() => import("@/components/surveyjs/survey-runner"), { ssr: false });

const BOX_W = 168;
const BOX_H = 108;
const INNER_W = 720;
const SCALE = BOX_W / INNER_W;

/** Miniature, non-interactive preview of a form, rendered live from its stored content. */
export default function RfiThumbnail({ rfi, onClick }: { rfi: Pick<RFI, "subject" | "content">; onClick?: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const content = rfi.content;
  let body: React.ReactNode = null;

  if (visible && content?.surveyDefinition) {
    body = (
      <div style={{ width: INNER_W, transform: `scale(${SCALE})`, transformOrigin: "top left" }} className="pointer-events-none">
        <SurveyRunner json={content.surveyDefinition} theme={content.surveyTheme} readOnly />
      </div>
    );
  } else if (visible && content?.html) {
    // Sandboxed frame without scripts: the form's own CSS cannot leak into the app.
    const doc = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;overflow:hidden}${content.css || ""}</style></head><body>${content.html}</body></html>`;
    body = (
      <iframe
        title={`${rfi.subject} preview`}
        sandbox=""
        srcDoc={doc}
        tabIndex={-1}
        style={{ width: INNER_W, height: BOX_H / SCALE, border: 0, transform: `scale(${SCALE})`, transformOrigin: "top left" }}
        className="pointer-events-none"
      />
    );
  } else if (!content) {
    body = (
      <div className="h-full w-full flex flex-col items-center justify-center gap-1 text-slate-300">
        <FileQuestion className="h-7 w-7" />
        <span className="text-[11px]">No content yet</span>
      </div>
    );
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={`Preview of ${rfi.subject}`}
      className="relative shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300 transition"
      style={{ width: BOX_W, height: BOX_H }}
    >
      {body ?? <div className="h-full w-full animate-pulse bg-slate-50" />}
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-white/90 to-transparent" />
    </button>
  );
}
