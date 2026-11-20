"use client";

import { useRouter } from "next/navigation";
import { ClipboardCheck, Headset } from "lucide-react";
import ProfileMenu from "@/components/profile-menu";
import NewFormMenu from "@/components/new-form-menu";
import { useAccess } from "@/lib/access";
import NotificationBell from "@/components/notification-bell";

export function BrandMark({ onClick }: { onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2.5 focus:outline-none" aria-label="Home">
      <span className="h-8 w-8 rounded-lg bg-gradient-to-br from-volt-500 to-volt-700 flex items-center justify-center shadow-md shadow-black/20">
        <ClipboardCheck className="h-[18px] w-[18px] text-white" />
      </span>
      <span className="text-[17px] font-bold tracking-tight text-white">RFI <span className="font-medium text-forest-200">System</span></span>
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
  const { canEditForms } = useAccess();
  return (
    <header className="bg-forest-900 text-sand-100 shrink-0 shadow-md shadow-forest-950/20 relative z-30">
      <div className="px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <BrandMark onClick={() => router.push("/")} />
          {left && <div className="h-6 w-px bg-white/15" />}
          {left}
        </div>
        <div className="flex items-center gap-3">
          <a href="/rfi/crm" className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium text-sand-100 hover:bg-white/10 hover:text-white transition" title="Open the Call Center">
            <Headset className="h-4 w-4" /> Call Center
          </a>
          {canEditForms && <NewFormMenu workspaceId={workspaceId} />}
          <NotificationBell />
          <ProfileMenu />
        </div>
      </div>
      {tabs && (
        <nav className="px-4 sm:px-6 flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => onTab?.(t.key)}
              className={`px-3.5 py-2.5 text-sm font-semibold border-b-[3px] transition-colors ${
                activeTab === t.key
                  ? "border-volt-400 text-white"
                  : "border-transparent text-forest-200 hover:text-white hover:border-white/30"
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
