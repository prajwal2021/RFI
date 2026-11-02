"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
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

function Inner() {
  const { me, canEditForms } = useAccess();
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspace") || undefined;
  if (me && !canEditForms) return <NoBuilderAccess />;
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
