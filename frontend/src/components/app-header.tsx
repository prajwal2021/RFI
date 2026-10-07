"use client";

import { useRouter } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import ProfileMenu from "@/components/profile-menu";
import NewFormMenu from "@/components/new-form-menu";

export function BrandMark({ onClick }: { onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2.5 focus:outline-none" aria-label="Home">
      <span className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
        <ClipboardCheck className="h-[18px] w-[18px] text-white" />
      </span>
      <span className="text-[17px] font-semibold tracking-tight text-slate-900">RFI System</span>
    </button>
  );
}

export interface HeaderTab {
  key: string;
  label: string;
}

export default function AppHeader({
  tabs,
  activeTab,
  onTab,
  workspaceId,
  left,
}: {
  tabs?: HeaderTab[];
  activeTab?: string;
  onTab?: (key: string) => void;
  workspaceId?: string;
  left?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <header className="bg-white border-b border-slate-200 shrink-0">
      <div className="px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <BrandMark onClick={() => router.push("/")} />
          {left && <div className="h-6 w-px bg-slate-200" />}
          {left}
        </div>
        <div className="flex items-center gap-3">
          <NewFormMenu workspaceId={workspaceId} />
          <ProfileMenu />
        </div>
      </div>
      {tabs && (
        <nav className="px-4 sm:px-6 flex gap-1 -mb-px">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => onTab?.(t.key)}
              className={`px-3.5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
}
