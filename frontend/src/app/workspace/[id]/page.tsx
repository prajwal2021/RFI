"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  fetchWorkspace, fetchWorkspaceRFIs, deleteRFI, publishRFI, getEditPath, RFI, Workspace,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Eye, Pencil, Trash2, FileText, Globe, Copy, ClipboardList, ListChecks, Lock, Building2,
} from "lucide-react";
import { format } from "date-fns";
import AppHeader from "@/components/app-header";
import FolderSidebar from "@/components/folder-sidebar";

const STATUS_VARIANT: Record<string, "draft" | "open" | "answered" | "closed"> = {
  draft: "draft",
  open: "open",
  answered: "answered",
  closed: "closed",
};

export default function WorkspacePage() {
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
    const size = large ? undefined : ("sm" as const);
    return (
      <>
        <Button size={size} onClick={() => router.push(`/forms/new?workspace=${id}`)}>
          <ClipboardList className="h-4 w-4 mr-1" /> SS Form
        </Button>
        <Button
          size={size}
          className="bg-[#19b394] hover:bg-[#139a7e] text-white"
          onClick={() => router.push(`/surveyjs/new?workspace=${id}`)}
        >
          <ListChecks className="h-4 w-4 mr-1" /> SurveyJS
        </Button>
        <Button
          variant="outline"
          size={size}
          className="border-[#19b394] text-[#19b394] hover:bg-emerald-50"
          onClick={() => router.push(`/surveyjs-clone/new?workspace=${id}`)}
        >
          <ListChecks className="h-4 w-4 mr-1" /> SurveyJS Clone
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
            <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-slate-900 truncate">{workspace?.name}</h1>
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
              {workspace?.description && <p className="text-xs text-slate-500 truncate">{workspace.description}</p>}
            </div>
          </div>
        }
      />

      <div className="flex-1 flex min-h-0">
        <FolderSidebar activeWorkspaceId={id} refreshKey={sidebarKey} />

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
                  <div key={rfi.id} className="flex items-center justify-between py-4 px-6">
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-medium truncate">{rfi.subject}</h4>
                        <Badge variant={STATUS_VARIANT[rfi.status]}>{rfi.status}</Badge>
                        {rfi.content?.formDefinition && (
                          <Badge variant="draft" className="bg-indigo-100 text-indigo-700 text-xs">SS Form</Badge>
                        )}
                        {rfi.content?.surveyDefinition && (
                          <Badge variant="draft" className="bg-emerald-100 text-emerald-700 text-xs">SurveyJS</Badge>
                        )}
                        {rfi.is_published && (
                          <Badge variant="open" className="bg-green-100 text-green-700 text-xs">
                            <Globe className="h-3 w-3 mr-1" /> Live
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {rfi.created_by} · {format(new Date(rfi.created_at), "MMM d, yyyy")}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {rfi.is_published && rfi.publish_key ? (
                        <Button variant="ghost" size="icon" title="Copy link" onClick={() => handleCopyLink(rfi)}>
                          {copiedId === rfi.id ? <span className="text-xs text-green-600">Copied</span> : <Copy className="h-4 w-4 text-green-600" />}
                        </Button>
                      ) : rfi.content ? (
                        <Button variant="ghost" size="icon" title="Publish" onClick={() => handleQuickPublish(rfi)}>
                          <Globe className="h-4 w-4 text-gray-400" />
                        </Button>
                      ) : null}
                      <Button variant="ghost" size="icon" title="View" onClick={() => router.push(`/rfi/${rfi.id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {editPath && (
                        <Button variant="ghost" size="icon" title="Edit" onClick={() => router.push(editPath)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" title="Delete" onClick={() => handleDelete(rfi.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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
