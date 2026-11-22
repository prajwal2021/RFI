"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  RFI, Workspace, Me, fetchRFIs, fetchWorkspaces, fetchMe, deleteRFI, publishRFI,
  createWorkspace, deleteWorkspace, getEditPath, moveRFI, copyRFI,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Eye, Pencil, Trash2, Search, Globe, Copy, FolderPlus, Folder, Plus, X, Lock, Building2, Inbox, Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import AppHeader from "@/components/app-header";
import DashboardAnalytics from "@/components/dashboard-analytics";
import FolderSidebar from "@/components/folder-sidebar";
import { isRfiDrag, readRfiDrag, startRfiDrag } from "@/lib/dnd";
import RfiThumbnail from "@/components/rfi-thumbnail";
import ResponsesPanel from "@/components/responses-panel";

type Tab = "overview" | "workspaces" | "rfis" | "responses";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "workspaces", label: "Workspaces" },
  { key: "rfis", label: "Forms" },
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
  const [filterStatus] = useState<string>("");
  const [pubFilter, setPubFilter] = useState<"" | "live" | "draft">("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showNewWs, setShowNewWs] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [newWsVisibility, setNewWsVisibility] = useState<"private" | "org">("private");
  const [wsError, setWsError] = useState<string | null>(null);
  const [sidebarKey, setSidebarKey] = useState(0);
  const [dragOverWs, setDragOverWs] = useState<string | null>(null);

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
    if (!confirm("Delete this form and all its responses? This cannot be undone.")) return;
    await deleteRFI(id);
    setRfis(rfis.filter((r) => r.id !== id));
    setSidebarKey((k) => k + 1);
  }

  async function handleUseTemplate(rfi: RFI) {
    try {
      const copy = await copyRFI(rfi.id, null);
      router.push(getEditPath(copy) || `/rfi/${copy.id}`);
    } catch {
      alert("Could not copy the example. Try again.");
    }
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
      alert("Could not publish. Open the form and add at least one question first.");
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
      (!pubFilter || (pubFilter === "live") === !!rfi.is_published) &&
      (rfi.subject.toLowerCase().includes(search.toLowerCase()) ||
        rfi.created_by.toLowerCase().includes(search.toLowerCase()))
  );

  const hasOrg = !!me?.org_id;
  const canEdit = !me || me.is_admin || me.is_rfi_user !== false;

  function openForms(published: boolean) {
    setPubFilter(published ? "live" : "");
    setSearch("");
    setTab("rfis");
  }

  function openResponses(form: string, from: string, to: string) {
    setRespFilter({ form, from, to, nonce: Date.now() });
    setTab("responses");
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <AppHeader
        tabs={TABS}
        activeTab={tab}
        onTab={(k) => {
          if (k === "responses") setRespFilter({ form: "", from: "", to: "", nonce: Date.now() });
          setTab(k as Tab);
        }}
      />

      <div className="flex-1 flex min-h-0">
        <FolderSidebar refreshKey={sidebarKey} onMoved={() => loadData()} />

        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-8">
          {/* ── Overview Tab ── */}
          {tab === "overview" && (
            <div>
              <div className="mb-6 relative overflow-hidden rounded-2xl bg-gradient-to-br from-forest-800 via-forest-900 to-forest-950 px-6 py-6 sm:px-8 text-white shadow-lift">
                <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-volt-500/30 blur-3xl" />
                <div className="pointer-events-none absolute right-24 -bottom-24 h-48 w-48 rounded-full bg-sand-300/20 blur-3xl" />
                <div className="relative">
                  <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-volt-200">Overview</div>
                  <h2 className="mt-1 text-2xl font-bold tracking-tight">
                    {me?.email ? `Welcome back, ${me.email.split("@")[0].split(/[._-]/)[0].replace(/^./, (c) => c.toUpperCase())}` : "Welcome back"}
                  </h2>
                  <p className="mt-1 text-sm text-forest-100/80 max-w-xl">Forms created and responses received across your workspaces. Click any number to see the records behind it.</p>
                </div>
              </div>
              <DashboardAnalytics onOpenResponses={openResponses} onOpenForms={openForms} />
            </div>
          )}

          {/* ── Workspaces Tab ── */}
          {tab === "workspaces" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold tracking-tight text-forest-900">Your Workspaces</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {showNewWs ? (
                  <Card className="border-2 border-volt-200 bg-volt-50/40">
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
                          className={`flex flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left ${newWsVisibility === "private" ? "border-volt-500 bg-white ring-1 ring-volt-500" : "border-sand-300 bg-white hover:bg-sand-50"}`}
                        >
                          <span className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
                            <Lock className="h-3.5 w-3.5" /> Private
                          </span>
                          <span className="text-[11px] text-gray-500">Only you</span>
                        </button>
                        <button
                          onClick={() => hasOrg && setNewWsVisibility("org")}
                          disabled={!hasOrg}
                          className={`flex flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left disabled:opacity-50 disabled:cursor-not-allowed ${newWsVisibility === "org" ? "border-volt-500 bg-white ring-1 ring-volt-500" : "border-sand-300 bg-white hover:bg-sand-50"}`}
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
                ) : !canEdit ? null : (
                  <Card
                    className="cursor-pointer hover:shadow-md transition border-2 border-dashed border-sand-300 hover:border-volt-400 hover:bg-white"
                    onClick={() => setShowNewWs(true)}
                  >
                    <CardContent className="flex flex-col items-center justify-center py-10">
                      <FolderPlus className="h-10 w-10 text-forest-300 mb-3" />
                      <h3 className="font-semibold text-forest-800">New workspace</h3>
                      <p className="text-xs text-forest-700/60 mt-0.5">Group forms by program or term</p>
                    </CardContent>
                  </Card>
                )}

                {workspaces.map((ws) => (
                  <Card
                    key={ws.id}
                    className={`cursor-pointer hover:shadow-md transition-all group ${dragOverWs === ws.id ? "ring-2 ring-volt-400 bg-volt-50/60 scale-[1.02]" : ""}`}
                    onClick={() => router.push(`/workspace/${ws.id}`)}
                    onDragOver={(e) => {
                      if (!isRfiDrag(e)) return;
                      e.preventDefault();
                      setDragOverWs(ws.id);
                    }}
                    onDragLeave={() => setDragOverWs((cur) => (cur === ws.id ? null : cur))}
                    onDrop={async (e) => {
                      const dragged = readRfiDrag(e);
                      setDragOverWs(null);
                      if (!dragged) return;
                      e.preventDefault();
                      if (dragged.from === ws.id) return;
                      try {
                        await moveRFI(dragged.id, ws.id);
                        await loadData();
                        setSidebarKey((k) => k + 1);
                      } catch (err) {
                        alert(err instanceof Error ? err.message : "Could not move the form");
                      }
                    }}
                  >
                    <CardContent className="py-5 px-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${ws.name === "Starter templates" ? "bg-volt-100" : "bg-forest-100"}`}>
                          {ws.name === "Starter templates" ? <Sparkles className="h-5 w-5 text-volt-600" /> : <Folder className="h-5 w-5 text-forest-700" />}
                        </div>
                        <div className="flex items-center gap-1">
                          {ws.is_example && <Badge variant="draft" className="text-xs bg-amber-100 text-amber-700">Example</Badge>}
                          <Badge
                            variant="draft"
                            className={`text-xs ${ws.visibility === "org" ? "bg-forest-100 text-forest-800" : "bg-sand-100 text-forest-800/70"}`}
                          >
                            {ws.visibility === "org" ? (
                              <><Building2 className="h-3 w-3 mr-1" /> Org</>
                            ) : (
                              <><Lock className="h-3 w-3 mr-1" /> Private</>
                            )}
                          </Badge>
                          {canEdit && (ws.is_owner || me?.is_admin) && (
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
                      <h3 className="font-semibold text-forest-900 mb-1 truncate">{ws.name}</h3>
                      {ws.description && <p className="text-xs text-forest-800/60 mb-2 line-clamp-2">{ws.description}</p>}
                      <div className="flex items-center gap-3 text-xs text-forest-800/60">
                        <span>{ws.rfi_count} form{ws.rfi_count !== 1 ? "s" : ""}</span>
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
                    No workspaces yet. Create one to organize your forms.
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
                        placeholder="Search forms by name or author…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <div className="inline-flex rounded-lg border border-sand-300 bg-sand-50 p-0.5">
                      {([["", "All"], ["live", "Live"], ["draft", "Drafts"]] as const).map(([v, l]) => (
                        <button key={v} onClick={() => setPubFilter(v)}
                          className={`h-8 px-4 rounded-md text-sm font-medium transition ${pubFilter === v ? "bg-white text-forest-900 shadow-sm" : "text-forest-700/70 hover:text-forest-900"}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Forms</CardTitle>
                  <CardDescription>Live forms accept responses at their public link. Drafts are not public yet.</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-12 text-muted-foreground">Loading...</div>
                  ) : filteredRFIs.length === 0 ? (
                    <div className="text-center py-12">
                      <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-1">No forms here</h3>
                      <p className="text-muted-foreground mb-4">Start from one of your Starter templates (Workspaces tab) or build a new form.</p>
                      {canEdit && (
                        <div className="flex items-center justify-center gap-3">
                          <Button onClick={() => router.push("/surveyjs-clone/new")}>
                            <Plus className="h-4 w-4 mr-2" /> New form
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredRFIs.map((rfi) => {
                        const editPath = getEditPath(rfi);
                        const readOnly = !!rfi.is_example && rfi.created_by !== me?.email;
                        return (
                          <div
                            key={rfi.id}
                            draggable={!readOnly}
                            onDragStart={(e) => startRfiDrag(e, rfi)}
                            className="flex items-center gap-4 py-4 first:pt-0 last:pb-0 cursor-grab active:cursor-grabbing"
                          >
                            <RfiThumbnail rfi={rfi} onClick={() => router.push(`/rfi/${rfi.id}`)} />
                            <div className="flex-1 min-w-0 mr-4">
                              <div className="flex items-center gap-3 mb-1">
                                <h4 className="font-medium text-foreground truncate">{rfi.subject}</h4>
                                {rfi.is_published ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-forest-100 text-forest-800 px-2 py-0.5 text-xs font-semibold"><Globe className="h-3 w-3" /> Live</span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full bg-sand-200 text-forest-800/70 px-2 py-0.5 text-xs font-semibold">Draft</span>
                                )}
                                <span className="inline-flex items-center rounded-full bg-sand-100 text-forest-800/70 px-2 py-0.5 text-xs max-w-[180px]">
                                  <Folder className="h-3 w-3 mr-1 shrink-0" />
                                  <span className="truncate">{workspaces.find((w) => w.id === rfi.workspace_id)?.name ?? (rfi.workspace_id ? "Workspace" : "Unfiled")}</span>
                                </span>
                                {rfi.is_example && (
                                  <Badge variant="draft" className="bg-amber-100 text-amber-700 text-xs">Example</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>By {rfi.created_by}</span>
                                <span>{format(new Date(rfi.created_at), "MMM d, yyyy")}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {rfi.is_published && rfi.publish_key ? (
                                <Button variant="outline" size="sm" title="Copy the public link" onClick={() => handleCopyLink(rfi)}>
                                  <Copy className="h-3.5 w-3.5 mr-1.5" />{copiedId === rfi.id ? "Copied" : "Copy link"}
                                </Button>
                              ) : rfi.content && canEdit && !readOnly ? (
                                <Button variant="outline" size="sm" title="Publish and copy the public link" onClick={() => handleQuickPublish(rfi)}>
                                  <Globe className="h-3.5 w-3.5 mr-1.5" />Publish
                                </Button>
                              ) : null}
                              {readOnly && canEdit && (
                                <Button variant="outline" size="sm" title="Make your own editable copy of this example" onClick={() => handleUseTemplate(rfi)}>
                                  Use as template
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" title="View" onClick={() => router.push(`/rfi/${rfi.id}`)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              {editPath && canEdit && !readOnly && (
                                <Button variant="ghost" size="icon" title="Edit" onClick={() => router.push(editPath)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              {canEdit && !readOnly && (
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
