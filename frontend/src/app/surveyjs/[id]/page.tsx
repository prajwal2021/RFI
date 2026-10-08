"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { fetchRFI } from "@/lib/api";

const SurveyJSCreator = dynamic(
  () => import("@/components/surveyjs/survey-creator"),
  { ssr: false }
);

export default function EditSurveyPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [json, setJson] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id === "new") {
      router.replace("/surveyjs-clone/new");
      return;
    }
    fetchRFI(id)
      .then((rfi) => {
        setJson(rfi.content?.surveyDefinition || null);
        setTitle(rfi.subject);
      })
      .catch(() => alert("Failed to load survey"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-500">
        Loading SurveyJS Creator...
      </div>
    );
  }

  return <SurveyJSCreator initialJson={json || undefined} initialTitle={title} rfiId={id} />;
}
