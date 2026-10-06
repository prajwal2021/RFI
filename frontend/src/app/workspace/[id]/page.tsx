"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { fetchWorkspace, fetchWorkspaceRFIs, deleteRFI, publishRFI, RFI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, FilePlus2, Eye, Pencil, Trash2, FileText,
  Globe, Copy, ClipboardList,
} from "lucide-react";
import { format } from "date-fns";

const STATUS_VARIANT: Record<string, "draft" | "open" | "answered" | "closed"> = {
  draft: "draft",
  open: "open",
  answered: "answered",
  closed: "closed",
};

interface Workspace {
  id: string;
  name: string;
  description: string;
  created_by: string;
  rfi_count: number;
  created_at: string;
}

export default function WorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [rfis, setRfis] = useState<RFI[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchWorkspace(id), fetchWorkspaceRFIs(id)])
      .then(([ws, r]) => {
        setWorkspace(ws);
        setRfis(r);
      })
      .catch(() => alert("Failed to load workspace"))
      .finally(() => setLoading(false));
  }, [id]);

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
      setRfis(rfis.map((r) => r.id === rfi.id ? { ...r, is_published: true, publish_key: result.publish_key, status: "open" as const } : r));
    } catch {
      alert("Failed to publish");
    }
  }

  async function handleDelete(rfiId: string) {
    if (!confirm("Delete this item?")) return;
    await deleteRFI(rfiId);
    setRfis(rfis.filter((r) => r.id !== rfiId));
  }

  function getEditPath(rfi: RFI) {
    return rfi.content?.formDefinition ? `/forms/${rfi.id}` : `/builder/${rfi.id}`;
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <div>
                <h1 className="text-xl font-bold">{workspace?.name}</h1>
                {workspace?.description && (
                  <p className="text-sm text-gray-500">{workspace.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => router.push(`/builder/new?workspace=${id}`)}>
                <FilePlus2 className="h-4 w-4 mr-1" /> Visual RFI
              </Button>
              <Button size="sm" onClick={() => router.push(`/forms/new?workspace=${id}`)}>
                <ClipboardList className="h-4 w-4 mr-1" /> SS Form
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {rfis.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border shadow-sm">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No items yet</h3>
            <p className="text-gray-500 mb-6">Create an RFI or form to get started</p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={() => router.push(`/builder/new?workspace=${id}`)}>
                <FilePlus2 className="h-4 w-4 mr-1" /> Visual RFI
              </Button>
              <Button onClick={() => router.push(`/forms/new?workspace=${id}`)}>
                <ClipboardList className="h-4 w-4 mr-1" /> SS Form
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border shadow-sm divide-y">
            {rfis.map((rfi) => (
              <div key={rfi.id} className="flex items-center justify-between py-4 px-6">
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-medium truncate">{rfi.subject}</h4>
                    <Badge variant={STATUS_VARIANT[rfi.status]}>{rfi.status}</Badge>
                    {rfi.content?.formDefinition && (
                      <Badge variant="draft" className="bg-indigo-100 text-indigo-700 text-xs">SS Form</Badge>
                    )}
                    {rfi.is_published && (
                      <Badge variant="open" className="bg-green-100 text-green-700 text-xs">
                        <Globe className="h-3 w-3 mr-1" /> Live
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {format(new Date(rfi.created_at), "MMM d, yyyy")}
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
                  <Button variant="ghost" size="icon" title="Edit" onClick={() => router.push(getEditPath(rfi))}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Delete" onClick={() => handleDelete(rfi.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
