"use client";

import { useMemo, useState } from "react";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import { Themed, SurveyTheme } from "@/components/surveyjs-clone/theme";
import { attachAppearance } from "@/components/surveyjs-clone/appearance";
import "survey-core/defaultV2.min.css";

export function LanguageSelect({ model }: { model: Model }) {
  const [, force] = useState(0);
  const used: string[] = (model as any).getUsedLocales ? (model as any).getUsedLocales() : [];
  if (used.length < 2) return null;
  return (
    <div className="flex justify-end px-4 pt-3">
      <select
        value={model.locale || "default"}
        onChange={(e) => {
          model.locale = e.target.value === "default" ? "" : e.target.value;
          force((n) => n + 1);
        }}
        className="text-sm border border-gray-300 rounded px-2 py-1 bg-white text-gray-800"
      >
        {used.map((l) => (
          <option key={l} value={l}>
            {l === "default" ? "Default" : l}
          </option>
        ))}
      </select>
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
      <LanguageSelect model={model} />
      <Survey model={model} />
    </Themed>
  );
}
