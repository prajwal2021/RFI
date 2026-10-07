"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { fetchRFI } from "@/lib/api";

const SurveyDesigner = dynamic(
  () => import("@/components/surveyjs-clone/survey-designer"),
  { ssr: false }
);

export default function EditSurveyClonePage() {
  const params = useParams();
  const id = params.id as string;
  const [json, setJson] = useState<any>(null);
  const [theme, setTheme] = useState<any>(undefined);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRFI(id)
      .then((rfi) => {
        setJson(rfi.content?.surveyDefinition || null);
        setTheme(rfi.content?.surveyTheme);
        setTitle(rfi.subject);
      })
      .catch(() => alert("Failed to load survey"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-500">
        Loading designer...
      </div>
    );
  }

  return <SurveyDesigner initialJson={json || undefined} initialTheme={theme} initialTitle={title} rfiId={id} />;
}
