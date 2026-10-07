"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";

const SurveyDesigner = dynamic(
  () => import("@/components/surveyjs-clone/survey-designer"),
  { ssr: false }
);

function Inner() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspace") || undefined;
  return <SurveyDesigner workspaceId={workspaceId} />;
}

export default function NewSurveyClonePage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center text-gray-500">
          Loading designer...
        </div>
      }
    >
      <Inner />
    </Suspense>
  );
}
