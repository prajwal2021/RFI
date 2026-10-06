"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const FormBuilder = dynamic(
  () => import("@/components/form-builder/form-builder"),
  { ssr: false }
);

function FormBuilderWrapper() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspace") || undefined;

  return <FormBuilder workspaceId={workspaceId} />;
}

export default function NewFormPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center text-gray-500">Loading form builder...</div>}>
      <FormBuilderWrapper />
    </Suspense>
  );
}
