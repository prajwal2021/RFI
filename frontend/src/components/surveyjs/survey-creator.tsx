"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SurveyCreator, SurveyCreatorComponent } from "survey-creator-react";
import { ArrowLeft, Save } from "lucide-react";
import { createRFI, updateRFI } from "@/lib/api";
import "survey-core/defaultV2.min.css";
import "survey-creator-core/survey-creator-core.min.css";

const PLACEHOLDER_HTML =
  '<div style="padding:24px;color:#64748b;font-size:14px;">This form is built with SurveyJS and is rendered by the SurveyJS runtime on the public page.</div>';

export default function SurveyJSCreator({
  initialJson,
  initialTitle,
  rfiId,
  workspaceId,
}: {
  initialJson?: any;
  initialTitle?: string;
  rfiId?: string;
  workspaceId?: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const creator = useMemo(() => {
    const c = new SurveyCreator({
      showLogicTab: true,
      showTranslationTab: false,
      showJSONEditorTab: true,
      isAutoSave: false,
    });
    c.JSON = initialJson || {
      title: initialTitle || "Untitled Survey",
      pages: [{ name: "page1", elements: [] }],
    };
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const json = creator.JSON;
      const subject = json.title || initialTitle || "Untitled Survey";
      const content = {
        surveyDefinition: json,
        html: PLACEHOLDER_HTML,
        css: "",
        projectData: {},
      };
      if (rfiId) {
        await updateRFI(rfiId, { subject, content });
        alert("Survey saved!");
      } else {
        const rfi = await createRFI({
          subject,
          created_by: "admin",
          content,
          workspace_id: workspaceId,
        });
        router.push(`/rfi/${rfi.id}`);
      }
    } catch {
      alert("Failed to save survey");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      <header className="h-12 shrink-0 flex items-center justify-between px-4 bg-[#19b394] text-white">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="p-1 hover:bg-white/15 rounded"
            title="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold tracking-wide">SurveyJS Creator</span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold bg-white text-[#19b394] rounded hover:bg-gray-100 disabled:opacity-60"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? "Saving..." : "Save"}
        </button>
      </header>
      <div className="flex-1 min-h-0">
        <SurveyCreatorComponent creator={creator} />
      </div>
    </div>
  );
}
