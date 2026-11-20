"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

export default function NewFormMenu({ workspaceId }: { workspaceId?: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(workspaceId ? `/surveyjs-clone/new?workspace=${workspaceId}` : "/surveyjs-clone/new")}
      className="inline-flex items-center gap-1.5 h-9 pl-3 pr-3.5 rounded-lg bg-volt-600 text-white text-sm font-semibold shadow-md shadow-volt-600/30 transition hover:bg-volt-700 focus:outline-none focus:ring-2 focus:ring-volt-300"
    >
      <Plus className="h-4 w-4" /> New form
    </button>
  );
}
