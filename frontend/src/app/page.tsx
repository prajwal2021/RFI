"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  RFI, Workspace, Me, fetchRFIs, fetchWorkspaces, fetchMe, deleteRFI, publishRFI,
  createWorkspace, deleteWorkspace, getEditPath,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Eye, Pencil, Trash2, Search, Globe, Copy, FolderPlus, Folder, ClipboardList, X, ListChecks, Lock, Building2, Inbox,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import AppHeader from "@/components/app-header";
import DashboardAnalytics from "@/components/dashboard-analytics";
import FolderSidebar from "@/components/folder-sidebar";
import RfiThumbnail from "@/components/rfi-thumbnail";
import ResponsesPanel from "@/components/responses-panel";

const STATUS_VARIANT: Record<string, "draft" | "open" | "answered" | "closed"> = {
  draft: "draft",
  open: "open",
  answered: "answered",
  closed: "closed",
};

type Tab = "overview" | "workspaces" | "rfis" | "responses";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "workspaces", label: "Workspaces" },
  { key: "rfis", label: "All RFIs" },
  { key: "responses", label: "Responses" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [respFilter, setRespFilter] = useState({ form: "", from: "", to: "", nonce: 0 });
  const [rfis, setRfis] = useState<RFI[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showNewWs, setShowNewWs] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [newWsVisibility, setNewWsVisibility] = useState<"private" | "org">("private");
  const [wsError, setWsError] = useState<string | null>(null);
  const [sidebarKey, setSidebarKey] = useState(0);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  async function loadData() {
    setLoading(true);
    try {
      const [ws, r, profile] = await Promise.all([
        fetchWorkspaces(),
        fetchRFIs(filterStatus || undefined),
        fetchMe(),
      ]);
      setWorkspaces(ws);
      setRfis(r);
      setMe(profile);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this RFI?")) return;
    await deleteRFI(id);
    setRfis(rfis.filter((r) => r.id !== id));
    setSidebarKey((k) => k + 1);
  }

  async function handleDeleteWorkspace(id: string) {
    if (!confirm("Delete this workspace and all its contents?")) return;
    try {
      await deleteWorkspace(id);
      setWorkspaces(workspaces.filter((w) => w.id !== id));
      setSidebarKey((k) => k + 1);
    } catch {
      alert("Failed to delete workspace");
    }
  }

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
      setRfis(
        rfis.map((r) =>
          r.id === rfi.id
            ? { ...r, is_published: true, publish_key: result.publish_key, status: "open" as const }
            : r
        )
      );
      navigator.clipboard.writeText(`${window.location.origin}/rfi/public/${result.publish_key}`);
      setCopiedId(rfi.id);
      setTimeout(() => setCopiedId(null), 2000);
      setSidebarKey((k) => k + 1);
    } catch {
      alert("Failed to publish. Make sure the RFI has content.");
    }
  }

  async function handleCreateWorkspace() {
    if (!newWsName.trim()) return;
    setWsError(null);
    try {
      const ws = await createWorkspace({ name: newWsName.trim(), visibility: newWsVisibility });
      setWorkspaces([ws, ...workspaces]);
      setNewWsName("");
      setNewWsVisibility("private");
      setShowNewWs(false);
      setSidebarKey((k) => k + 1);
    } catch (e) {
      setWsError(e instanceof Error ? e.message : "Failed to create workspace");
    }
  }

  const filteredRFIs = rfis.filter(
    (rfi) =>
      rfi.subject.toLowerCase().includes(search.toLowerCase()) ||
      rfi.created_by.toLowerCase().includes(search.toLowerCase())
  );

  const hasOrg = !!me?.org_id;

  function openResponses(form: string, from: string, to: string) {
    setRespFilter({ form, from, to, nonce: Date.now() });
    setTab("responses");
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <AppHeader
        tabs={TABS}
        activeTab={tab}
        onTab={(k) => {
          if (k === "responses") setRespFilter({ form: "", from: "", to: "", nonce: Date.now() });
          setTab(k as Tab);
        }}
      />

      <div className="flex-1 flex min-h-0">
        <FolderSidebar refreshKey={sidebarKey} />

        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-8">
          {/* ── Overview Tab ── */}
          {tab === "overview" && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">Overview</h2>
                <p className="text-sm text-slate-500">Forms created and responses received across your workspaces.</p>
              </div>
              <DashboardAnalytics onOpenResponses={openResponses} />
            </div>
          )}

          {/* ── Workspaces Tab ── */}
          {tab === "workspaces" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Your Workspaces</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {showNewWs ? (
                  <Card className="border-2 border-blue-200 bg-blue-50/30">
                    <CardContent className="py-5 px-4">
                      <Input
                        value={newWsName}
                        onChange={(e) => setNewWsName(e.target.value)}
                        placeholder="Workspace name"
                        autoFocus
                        onKeyDown={(e) => e.key === "Enter" && handleCreateWorkspace()}
                        className="mb-3"
                      />
                      <div className="text-xs font-medium text-gray-600 mb-1.5">Visibility</div>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <button
                          onClick={() => setNewWsVisibility("private")}
                          className={`flex flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left ${newWsVisibility === "private" ? "border-blue-500 bg-white ring-1 ring-blue-500" : "border-gray-200 bg-white hover:bg-gray-50"}`}
                        >
                          <span className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
                            <Lock className="h-3.5 w-3.5" /> Private
                          </span>
                          <span className="text-[11px] text-gray-500">Only you</span>
                        </button>
                        <button
                          onClick={() => hasOrg && setNewWsVisibility("org")}
                          disabled={!hasOrg}
                          className={`flex flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left disabled:opacity-50 disabled:cursor-not-allowed ${newWsVisibility === "org" ? "border-blue-500 bg-white ring-1 ring-blue-500" : "border-gray-200 bg-white hover:bg-gray-50"}`}
                        >
                          <span className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
                            <Building2 className="h-3.5 w-3.5" /> Organisation
                          </span>
                          <span className="text-[11px] text-gray-500 truncate max-w-full">
                            {hasOrg ? `Everyone in ${me?.org_name}` : "You are not in an organisation"}
                          </span>
                        </button>
                      </div>
                      {wsError && <p className="text-xs text-red-600 mb-2">{wsError}</p>}
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleCreateWorkspace} className="flex-1">Create</Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowNewWs(false);
                            setNewWsName("");
                            setWsError(null);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card
                    className="cursor-pointer hover:shadow-md transition-shadow border-2 border-dashed border-gray-300 hover:border-blue-400"
                    onClick={() => setShowNewWs(true)}
                  >
                    <CardContent className="flex flex-col items-center justify-center py-10">
                      <FolderPlus className="h-10 w-10 text-gray-400 mb-3" />
                      <h3 className="font-medium text-gray-600">Create Workspace</h3>
                    </CardContent>
                  </Card>
                )}

                {workspaces.map((ws) => (
                  <Card
                    key={ws.id}
                    className="cursor-pointer hover:shadow-md transition-shadow group"
                    onClick={() => router.push(`/workspace/${ws.id}`)}
                  >
                    <CardContent className="py-5 px-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                          <Folder className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge
                            variant="draft"
                            className={`text-xs ${ws.visibility === "org" ? "bg-sky-100 text-sky-700" : "bg-gray-100 text-gray-600"}`}
                          >
                            {ws.visibility === "org" ? (
                              <><Building2 className="h-3 w-3 mr-1" /> Org</>
                            ) : (
                              <><Lock className="h-3 w-3 mr-1" /> Private</>
                            )}
                          </Badge>
                          {(ws.is_owner || me?.is_admin) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteWorkspace(ws.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-gray-400" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1 truncate">{ws.name}</h3>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{ws.rfi_count} item{ws.rfi_count !== 1 ? "s" : ""}</span>
                        <span>{format(new Date(ws.created_at), "MMM d, yyyy")}</span>
                      </div>
                      {ws.visibility === "org" && !ws.is_owner && ws.owner_email && (
                        <div className="text-xs text-gray-400 mt-1 truncate">by {ws.owner_email}</div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {workspaces.length === 0 && !showNewWs && !loading && (
                  <div className="col-span-full text-center py-8 text-gray-400 text-sm">
                    No workspaces yet. Create one to organize your RFIs and forms.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── All RFIs Tab ── */}
          {tab === "rfis" && (
            <div>
              <Card className="mb-6">
                <CardContent className="py-4">
                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search RFIs..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <div className="flex gap-2">
                      {["", "draft", "open", "answered", "closed"].map((status) => (
                        <Button
                          key={status}
                          variant={filterStatus === status ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFilterStatus(status)}
                        >
                          {status || "All"}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">All RFIs</CardTitle>
                  <CardDescription>Manage and track all your Requests for Information</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-12 text-muted-foreground">Loading...</div>
                  ) : filteredRFIs.length === 0 ? (
                    <div className="text-center py-12">
                      <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-1">No RFIs found</h3>
                      <p className="text-muted-foreground mb-4">Get started by creating your first form</p>
                      <div className="flex items-center justify-center gap-3">
                        <Button onClick={() => router.push("/forms/new")}>
                          <ClipboardList className="h-4 w-4 mr-2" /> SS Form
                        </Button>
                        <Button
                          className="bg-[#19b394] hover:bg-[#139a7e] text-white"
                          onClick={() => router.push("/surveyjs/new")}
                        >
                          <ListChecks className="h-4 w-4 mr-2" /> SurveyJS
                        </Button>
                        <Button
                          variant="outline"
                          className="border-[#19b394] text-[#19b394] hover:bg-emerald-50"
                          onClick={() => router.push("/surveyjs-clone/new")}
                        >
                          <ListChecks className="h-4 w-4 mr-2" /> SurveyJS Clone
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredRFIs.map((rfi) => {
                        const editPath = getEditPath(rfi);
                        return (
                          <div key={rfi.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                            <RfiThumbnail rfi={rfi} onClick={() => router.push(`/rfi/${rfi.id}`)} />
                            <div className="flex-1 min-w-0 mr-4">
                              <div className="flex items-center gap-3 mb-1">
                                <h4 className="font-medium text-foreground truncate">{rfi.subject}</h4>
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
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>By {rfi.created_by}</span>
                                <span>{format(new Date(rfi.created_at), "MMM d, yyyy")}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {rfi.is_published && rfi.publish_key ? (
                                <Button variant="ghost" size="icon" title="Copy public link" onClick={() => handleCopyLink(rfi)}>
                                  {copiedId === rfi.id ? (
                                    <span className="text-xs text-green-600 font-medium">Copied</span>
                                  ) : (
                                    <Copy className="h-4 w-4 text-green-600" />
                                  )}
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
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Responses Tab ── */}
          {tab === "responses" && (
            <ResponsesPanel key={respFilter.nonce} initialForm={respFilter.form} initialFrom={respFilter.from} initialTo={respFilter.to} />
          )}
        </main>
      </div>
    </div>
  );
}
