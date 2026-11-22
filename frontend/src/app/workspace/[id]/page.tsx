"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  fetchWorkspace, fetchWorkspaceRFIs, deleteRFI, publishRFI, getEditPath, RFI, Workspace,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Eye, Pencil, Trash2, FileText, Globe, Copy, Plus, Lock, Building2,
} from "lucide-react";
import { format } from "date-fns";
import AppHeader from "@/components/app-header";
import { useAccess } from "@/lib/access";
import FolderSidebar from "@/components/folder-sidebar";
import RfiThumbnail from "@/components/rfi-thumbnail";
import { startRfiDrag } from "@/lib/dnd";

export default function WorkspacePage() {
  const { canEditForms } = useAccess();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [rfis, setRfis] = useState<RFI[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sidebarKey, setSidebarKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchWorkspace(id), fetchWorkspaceRFIs(id)])
      .then(([ws, r]) => {
        setWorkspace(ws);
        setRfis(r);
      })
      .catch(() => {
        alert("Workspace not found or you do not have access");
        router.push("/");
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  function handleCopyLink(rfi: RFI) {
    if (rfi.publish_key) {
      navigator.clipboard.writeText(`${window.location.origin}/rfi/public/${rfi.publish_key}`);
      setCopiedId(rfi.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  async function handleQuickPublish(rfi: RFI) {
    try {
      const result = await publishRFI(rfi.id);
      setRfis(rfis.map((r) => (r.id === rfi.id ? { ...r, is_published: true, publish_key: result.publish_key, status: "open" as const } : r)));
      setSidebarKey((k) => k + 1);
    } catch {
      alert("Failed to publish");
    }
  }

  async function handleDelete(rfiId: string) {
    if (!confirm("Delete this item?")) return;
    await deleteRFI(rfiId);
    setRfis(rfis.filter((r) => r.id !== rfiId));
    setSidebarKey((k) => k + 1);
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  }

  const createButtons = (large: boolean) => {
    if (!canEditForms) return null;
    const size = large ? undefined : ("sm" as const);
    return (
      <>
        <Button size={size} onClick={() => router.push(`/surveyjs-clone/new?workspace=${id}`)}>
          <Plus className="h-4 w-4 mr-1" /> New form
        </Button>
      </>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <AppHeader
        workspaceId={id}
        left={
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" className="text-forest-200 hover:bg-white/10 hover:text-white" onClick={() => router.push("/")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white truncate">{workspace?.name}</h1>
                {workspace && (
                  <Badge
                    variant="draft"
                    className={`text-xs ${workspace.visibility === "org" ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-600"}`}
                  >
                    {workspace.visibility === "org" ? (
                      <><Building2 className="h-3 w-3 mr-1" /> Organisation</>
                    ) : (
                      <><Lock className="h-3 w-3 mr-1" /> Private</>
                    )}
                  </Badge>
                )}
              </div>
              {workspace?.description && <p className="text-xs text-forest-200 truncate">{workspace.description}</p>}
            </div>
          </div>
        }
      />

      <div className="flex-1 flex min-h-0">
        <FolderSidebar
          activeWorkspaceId={id}
          refreshKey={sidebarKey}
          onMoved={() => {
            fetchWorkspaceRFIs(id).then(setRfis).catch(() => undefined);
            fetchWorkspace(id).then(setWorkspace).catch(() => undefined);
          }}
        />

        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-8">
          {rfis.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-lg border shadow-sm">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No items yet</h3>
              <p className="text-gray-500 mb-6">Create a form to get started</p>
              <div className="flex items-center justify-center gap-3">{createButtons(true)}</div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border shadow-sm divide-y">
              {rfis.map((rfi) => {
                const editPath = getEditPath(rfi);
                return (
                  <div
                    key={rfi.id}
                    draggable
                    onDragStart={(e) => startRfiDrag(e, rfi)}
                    className="flex items-center gap-4 py-4 px-6 cursor-grab active:cursor-grabbing"
                  >
                    <RfiThumbnail rfi={rfi} onClick={() => router.push(`/rfi/${rfi.id}`)} />
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-medium truncate">{rfi.subject}</h4>
                        {rfi.is_published ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-forest-100 text-forest-800 px-2 py-0.5 text-xs font-semibold"><Globe className="h-3 w-3" /> Live</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-sand-200 text-forest-800/70 px-2 py-0.5 text-xs font-semibold">Draft</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {rfi.created_by} · {format(new Date(rfi.created_at), "MMM d, yyyy")}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {rfi.is_published && rfi.publish_key ? (
                        <Button variant="outline" size="sm" title="Copy the public link" onClick={() => handleCopyLink(rfi)}>
                          <Copy className="h-3.5 w-3.5 mr-1.5" />{copiedId === rfi.id ? "Copied" : "Copy link"}
                        </Button>
                      ) : rfi.content && canEditForms ? (
                        <Button variant="outline" size="sm" title="Publish and copy the public link" onClick={() => handleQuickPublish(rfi)}>
                          <Globe className="h-3.5 w-3.5 mr-1.5" />Publish
                        </Button>
                      ) : null}
                      <Button variant="ghost" size="icon" title="Preview and responses" onClick={() => router.push(`/rfi/${rfi.id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {editPath && canEditForms && (
                        <Button variant="ghost" size="icon" title="Edit" onClick={() => router.push(editPath)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canEditForms && (
                        <Button variant="ghost" size="icon" title="Delete" onClick={() => handleDelete(rfi.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
