"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

export default function NewFormMenu({ workspaceId }: { workspaceId?: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(workspaceId ? `/surveyjs-clone/new?workspace=${workspaceId}` : "/surveyjs-clone/new")}
      className="inline-flex items-center gap-1.5 h-9 pl-3 pr-3.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/40"
    >
      <Plus className="h-4 w-4" /> New form
    </button>
  );
}
