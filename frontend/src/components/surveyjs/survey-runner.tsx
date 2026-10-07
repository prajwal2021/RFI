"use client";

import { useMemo } from "react";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import "survey-core/defaultV2.min.css";

export default function SurveyRunner({
  json,
  readOnly,
  onComplete,
}: {
  json: any;
  readOnly?: boolean;
  onComplete?: (data: Record<string, any>) => void | Promise<void>;
}) {
  const model = useMemo(() => {
    const m = new Model(json);
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

  return <Survey model={model} />;
}
