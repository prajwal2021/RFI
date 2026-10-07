"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown, ChevronRight, Folder, FolderOpen, Lock, Building2, ClipboardList, ListChecks, FileText, Inbox,
} from "lucide-react";
import { fetchMe, fetchRFIs, fetchWorkspaces, Me, RFI, Workspace } from "@/lib/api";

function itemIcon(rfi: RFI) {
  if (rfi.content?.surveyDefinition) return <ListChecks className="h-3.5 w-3.5 text-emerald-600 shrink-0" />;
  if (rfi.content?.formDefinition) return <ClipboardList className="h-3.5 w-3.5 text-indigo-600 shrink-0" />;
  return <FileText className="h-3.5 w-3.5 text-gray-400 shrink-0" />;
}

function FolderNode({
  name, count, icon, open, active, onToggle, onOpen, title, children,
}: {
  name: string;
  count: number;
  icon: React.ReactNode;
  open: boolean;
  active?: boolean;
  onToggle: () => void;
  onOpen?: () => void;
  title?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <div
        className={`group flex items-center gap-1 pr-2 rounded-md ${active ? "bg-indigo-50 text-indigo-700" : "text-gray-700 hover:bg-gray-100"}`}
        title={title}
      >
        <button onClick={onToggle} className="p-1.5 text-gray-400 hover:text-gray-600" aria-label={open ? "Collapse" : "Expand"}>
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={onOpen || onToggle}
          className="flex-1 flex items-center gap-2 py-1.5 text-sm text-left min-w-0"
        >
          {icon}
          <span className="truncate font-medium">{name}</span>
        </button>
        <span className="text-[11px] text-gray-400">{count}</span>
      </div>
      {open && <div className="ml-5 border-l border-gray-200 pl-2 mb-1">{children}</div>}
    </div>
  );
}

export default function FolderSidebar({
  activeWorkspaceId,
  activeRfiId,
  refreshKey = 0,
}: {
  activeWorkspaceId?: string;
  activeRfiId?: string;
  refreshKey?: number;
}) {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [rfis, setRfis] = useState<RFI[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([fetchWorkspaces(), fetchRFIs(), fetchMe()])
      .then(([w, r, m]) => {
        setWorkspaces(w);
        setRfis(r);
        setMe(m);
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, [refreshKey]);

  useEffect(() => {
    if (activeWorkspaceId) setOpen((o) => ({ ...o, [activeWorkspaceId]: true }));
  }, [activeWorkspaceId]);

  const byWorkspace = useMemo(() => {
    const map: Record<string, RFI[]> = {};
    for (const r of rfis) {
      const key = r.workspace_id || "__unfiled";
      (map[key] ||= []).push(r);
    }
    return map;
  }, [rfis]);

  const privateWs = workspaces.filter((w) => w.visibility === "private");
  const orgWs = workspaces.filter((w) => w.visibility === "org");
  const unfiled = byWorkspace["__unfiled"] || [];

  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  const renderItems = (list: RFI[]) =>
    list.length === 0 ? (
      <div className="px-2 py-1 text-xs text-gray-400">Empty</div>
    ) : (
      list.map((r) => (
        <button
          key={r.id}
          onClick={() => router.push(`/rfi/${r.id}`)}
          className={`w-full flex items-center gap-2 px-2 py-1 rounded text-[13px] text-left ${activeRfiId === r.id ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
          title={r.subject}
        >
          {itemIcon(r)}
          <span className="truncate">{r.subject}</span>
          {r.is_published && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" title="Live" />}
        </button>
      ))
    );

  const renderWs = (ws: Workspace) => (
    <FolderNode
      key={ws.id}
      name={ws.name}
      count={byWorkspace[ws.id]?.length || 0}
      icon={
        open[ws.id] ? (
          <FolderOpen className="h-4 w-4 text-indigo-500 shrink-0" />
        ) : (
          <Folder className="h-4 w-4 text-indigo-500 shrink-0" />
        )
      }
      open={!!open[ws.id]}
      active={activeWorkspaceId === ws.id}
      onToggle={() => toggle(ws.id)}
      onOpen={() => router.push(`/workspace/${ws.id}`)}
      title={ws.owner_email ? `Owner: ${ws.owner_email}` : undefined}
    >
      {renderItems(byWorkspace[ws.id] || [])}
    </FolderNode>
  );

  const sectionTitle = (icon: React.ReactNode, text: string) => (
    <div className="flex items-center gap-1.5 px-2 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
      {icon} {text}
    </div>
  );

  return (
    <aside className="w-72 shrink-0 border-r bg-white overflow-y-auto">
      <div className="px-4 pt-4 pb-1 text-sm font-semibold text-gray-900">Folders</div>
      <div className="px-2 pb-6">
        {!loaded && <div className="px-2 py-3 text-xs text-gray-400">Loading…</div>}

        {sectionTitle(<Lock className="h-3 w-3" />, "Private")}
        {privateWs.length === 0 && loaded && <div className="px-2 py-1 text-xs text-gray-400">No private workspaces</div>}
        {privateWs.map(renderWs)}

        {sectionTitle(<Building2 className="h-3 w-3" />, me?.org_name ? `${me.org_name} (Organisation)` : "Organisation")}
        {orgWs.length === 0 && loaded && (
          <div className="px-2 py-1 text-xs text-gray-400">
            {me?.org_id ? "No shared workspaces" : "You are not in an organisation"}
          </div>
        )}
        {orgWs.map(renderWs)}

        {unfiled.length > 0 && (
          <>
            {sectionTitle(<Inbox className="h-3 w-3" />, "Unfiled")}
            <FolderNode
              name="No workspace"
              count={unfiled.length}
              icon={<Inbox className="h-4 w-4 text-gray-400 shrink-0" />}
              open={!!open["__unfiled"]}
              onToggle={() => toggle("__unfiled")}
            >
              {renderItems(unfiled)}
            </FolderNode>
          </>
        )}
      </div>
    </aside>
  );
}
