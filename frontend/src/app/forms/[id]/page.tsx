"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { fetchRFI } from "@/lib/api";
import { FormDef } from "@/components/form-builder/html-generator";

const FormBuilder = dynamic(
  () => import("@/components/form-builder/form-builder"),
  { ssr: false }
);

export default function EditFormPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [formDef, setFormDef] = useState<FormDef | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id === "new") {
      router.replace("/surveyjs-clone/new");
      return;
    }
    fetchRFI(id)
      .then((rfi) => {
        if (rfi.content?.formDefinition) {
          setFormDef(rfi.content.formDefinition as FormDef);
        } else {
          setFormDef({ title: rfi.subject, description: "", fields: [] });
        }
      })
      .catch(() => alert("Failed to load form"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-500">
        Loading form builder...
      </div>
    );
  }

  return <FormBuilder initialForm={formDef || undefined} rfiId={id} />;
}
