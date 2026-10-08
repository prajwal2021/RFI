"use client";

import { useEffect, useState } from "react";
import { Building2, Folder, Inbox, Lock, X } from "lucide-react";
import { fetchWorkspaces, moveRFI, RFI, Workspace } from "@/lib/api";

export default function MoveRfiDialog({
  rfi,
  onClose,
  onMoved,
}: {
  rfi: Pick<RFI, "id" | "subject" | "workspace_id">;
  onClose: () => void;
  onMoved: (workspaceId: string | null, workspaceName: string | null) => void;
}) {
  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkspaces()
      .then(setWorkspaces)
      .catch(() => setError("Could not load workspaces"));
  }, []);

  const move = async (ws: Workspace | null) => {
    setBusy(ws?.id ?? "__unfiled");
    setError(null);
    try {
      await moveRFI(rfi.id, ws?.id ?? null);
      onMoved(ws?.id ?? null, ws?.name ?? null);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not move the form");
      setBusy(null);
    }
  };

  const row = (key: string, active: boolean, icon: React.ReactNode, title: string, hint: string, onClick: () => void) => (
    <button
      key={key}
      disabled={active || busy !== null}
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left border ${
        active ? "border-indigo-200 bg-indigo-50" : "border-transparent hover:bg-slate-50"
      } disabled:cursor-default`}
    >
      <span className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-slate-900 truncate">{title}</span>
        <span className="block text-xs text-slate-500">{hint}</span>
      </span>
      {active && <span className="text-xs font-medium text-indigo-600">Current</span>}
      {busy === key && <span className="text-xs text-slate-400">Moving…</span>}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">Move to workspace</h2>
            <p className="text-xs text-slate-500 truncate">{rfi.subject}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-3 max-h-[60vh] overflow-y-auto space-y-0.5">
          {!workspaces && !error && <div className="py-8 text-center text-sm text-slate-400">Loading…</div>}
          {workspaces?.map((w) =>
            row(
              w.id,
              rfi.workspace_id === w.id,
              <Folder className="h-4 w-4 text-indigo-500" />,
              w.name,
              w.visibility === "org" ? "Organisation — visible to your whole org" : "Private — only you",
              () => move(w)
            )
          )}
          {workspaces &&
            row(
              "__unfiled",
              !rfi.workspace_id,
              <Inbox className="h-4 w-4 text-slate-400" />,
              "Unfiled",
              "Not in any workspace",
              () => move(null)
            )}
        </div>
        {error && <div className="mx-4 mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Private</span>
          <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> Organisation</span>
          <span className="ml-auto">Moving to an organisation workspace shares the form with that org.</span>
        </div>
      </div>
    </div>
  );
}
