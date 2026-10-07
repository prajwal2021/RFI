"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";

const SurveyJSCreator = dynamic(
  () => import("@/components/surveyjs/survey-creator"),
  { ssr: false }
);

function Inner() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspace") || undefined;
  return <SurveyJSCreator workspaceId={workspaceId} />;
}

export default function NewSurveyPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center text-gray-500">
          Loading SurveyJS Creator...
        </div>
      }
    >
      <Inner />
    </Suspense>
  );
}
