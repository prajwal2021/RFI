"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { fetchRFI } from "@/lib/api";
import { useAccess } from "@/lib/access";

const SurveyDesigner = dynamic(
  () => import("@/components/surveyjs-clone/survey-designer"),
  { ssr: false }
);


function NoBuilderAccess() {
  return (
    <div className="h-screen flex flex-col items-center justify-center gap-3 text-center px-6">
      <p className="text-lg font-semibold text-gray-900">Your account can view forms but not build them</p>
      <p className="text-sm text-gray-500 max-w-md">Call Center accounts are read-only on the RFI side. Ask an admin to tick &quot;RFI user&quot; on your account if you need to create or edit forms.</p>
      <a href="/rfi/" className="text-sm text-sky-700 hover:underline">Back to forms</a>
    </div>
  );
}

export default function EditSurveyClonePage() {
  const { me, canEditForms } = useAccess();
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

  if (me && !canEditForms) return <NoBuilderAccess />;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-500">
        Loading designer...
      </div>
    );
  }

  return <SurveyDesigner initialJson={json || undefined} initialTheme={theme} initialTitle={title} rfiId={id} />;
}
