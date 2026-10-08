"use client";

import { useMemo, useState } from "react";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import { Themed, SurveyTheme } from "@/components/surveyjs-clone/theme";
import { attachAppearance } from "@/components/surveyjs-clone/appearance";
import "survey-core/defaultV2.min.css";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English", es: "Español", fr: "Français", de: "Deutsch", it: "Italiano", pt: "Português", nl: "Nederlands",
  ru: "Русский", "zh-cn": "中文 (简体)", ja: "日本語", ko: "한국어", ar: "العربية", hi: "हिन्दी", tr: "Türkçe", pl: "Polski", sv: "Svenska",
};

export function LanguageSelect({ model }: { model: Model }) {
  const [, force] = useState(0);
  const raw: string[] = (model as any).getUsedLocales ? (model as any).getUsedLocales() : [];
  // SurveyJS reports the default language as "en" (or "default") and lists locales in arbitrary order.
  const used = Array.from(new Set(raw.map((l) => (l === "default" ? "en" : l))));
  if (used.length < 2) return null;
  used.sort((a, b) => (a === "en" ? -1 : b === "en" ? 1 : (LANGUAGE_NAMES[a] || a).localeCompare(LANGUAGE_NAMES[b] || b)));
  const current = model.locale || "en";
  return (
    <div className="flex justify-end px-4 pt-3">
      <label className="inline-flex items-center gap-2 text-xs text-gray-500">
        <span className="hidden sm:inline">Language</span>
        <select
          aria-label="Language"
          value={used.includes(current) ? current : used[0]}
          onChange={(e) => {
            model.locale = e.target.value === "en" ? "" : e.target.value;
            force((n) => n + 1);
          }}
          className="text-sm border border-gray-300 rounded-md px-2.5 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300"
        >
          {used.map((l) => (
            <option key={l} value={l}>
              {LANGUAGE_NAMES[l] || l}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export default function SurveyRunner({
  json,
  readOnly,
  onComplete,
  theme,
  fullPage,
}: {
  json: any;
  readOnly?: boolean;
  onComplete?: (data: Record<string, any>) => void | Promise<void>;
  theme?: SurveyTheme;
  fullPage?: boolean;
}) {
  const model = useMemo(() => {
    const m = new Model(json);
    attachAppearance(m);
    if (readOnly) m.mode = "display";
    if (onComplete) {
      m.showCompletedPage = false;
      m.onComplete.add((sender) => {
        onComplete(sender.data);
      });
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [json, readOnly]);

  return (
    <Themed theme={theme} className={fullPage ? "min-h-screen" : ""}>
      <div className={fullPage ? "mx-auto w-full max-w-[1000px]" : undefined}>
        <LanguageSelect model={model} />
        <Survey model={model} />
      </div>
    </Themed>
  );
}
