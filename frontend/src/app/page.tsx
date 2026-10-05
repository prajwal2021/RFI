"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RFI, fetchRFIs, deleteRFI, publishRFI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FilePlus2,
  Eye,
  Pencil,
  Trash2,
  FileText,
  LayoutDashboard,
  Clock,
  Search,
  Globe,
  Copy,
  Send,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

const STATUS_VARIANT: Record<string, "draft" | "open" | "answered" | "closed"> = {
  draft: "draft",
  open: "open",
  answered: "answered",
  closed: "closed",
};

export default function DashboardPage() {
  const router = useRouter();
  const [rfis, setRfis] = useState<RFI[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadRFIs();
  }, [filterStatus]);

  async function loadRFIs() {
    setLoading(true);
    try {
      const data = await fetchRFIs(filterStatus || undefined);
      setRfis(data);
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
  }

  function handleCopyLink(rfi: RFI) {
    if (rfi.publish_key) {
      const url = `${window.location.origin}/rfi/public/${rfi.publish_key}`;
      navigator.clipboard.writeText(url);
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
      const url = `${window.location.origin}/rfi/public/${result.publish_key}`;
      navigator.clipboard.writeText(url);
      setCopiedId(rfi.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      alert("Failed to publish. Make sure the RFI has content.");
    }
  }

  const filteredRFIs = rfis.filter(
    (rfi) =>
      rfi.subject.toLowerCase().includes(search.toLowerCase()) ||
      rfi.created_by.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: rfis.length,
    published: rfis.filter((r) => r.is_published).length,
    draft: rfis.filter((r) => r.status === "draft").length,
    answered: rfis.filter((r) => r.status === "answered").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LayoutDashboard className="h-7 w-7 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">RFI System</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow border-2 border-dashed border-blue-200 bg-blue-50/50 hover:border-blue-400"
            onClick={() => router.push("/builder/new")}
          >
            <CardContent className="flex flex-col items-center justify-center py-8">
              <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <FilePlus2 className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg text-blue-900">Create New RFI</h3>
              <p className="text-sm text-blue-600 mt-1">
                Design with visual builder
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <FileText className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="font-semibold text-lg">Total RFIs</h3>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.total}</p>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <div className="h-14 w-14 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                <Globe className="h-7 w-7 text-purple-600" />
              </div>
              <h3 className="font-semibold text-lg">Published</h3>
              <p className="text-3xl font-bold text-purple-600 mt-1">{stats.published}</p>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <div className="h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                <Send className="h-7 w-7 text-amber-600" />
              </div>
              <h3 className="font-semibold text-lg">Responses</h3>
              <p className="text-3xl font-bold text-amber-600 mt-1">
                {stats.answered}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="relative flex-1">
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

        {/* RFI List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your RFIs</CardTitle>
            <CardDescription>
              Manage and track all your Requests for Information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : filteredRFIs.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">No RFIs found</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by creating your first RFI
                </p>
                <Button onClick={() => router.push("/builder/new")}>
                  <FilePlus2 className="h-4 w-4 mr-2" />
                  Create RFI
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {filteredRFIs.map((rfi) => (
                  <div
                    key={rfi.id}
                    className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-medium text-foreground truncate">
                          {rfi.subject}
                        </h4>
                        <Badge variant={STATUS_VARIANT[rfi.status]}>
                          {rfi.status}
                        </Badge>
                        {rfi.is_published && (
                          <Badge variant="open" className="bg-green-100 text-green-700 text-xs">
                            <Globe className="h-3 w-3 mr-1" />
                            Live
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>By {rfi.created_by}</span>
                        <span>{format(new Date(rfi.created_at), "MMM d, yyyy")}</span>
                        <span>{rfi.responses.length} response(s)</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {rfi.is_published && rfi.publish_key ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Copy public link"
                          onClick={() => handleCopyLink(rfi)}
                        >
                          {copiedId === rfi.id ? (
                            <span className="text-xs text-green-600 font-medium">Copied</span>
                          ) : (
                            <Copy className="h-4 w-4 text-green-600" />
                          )}
                        </Button>
                      ) : rfi.content ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Publish"
                          onClick={() => handleQuickPublish(rfi)}
                        >
                          <Globe className="h-4 w-4 text-gray-400" />
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="icon"
                        title="View"
                        onClick={() => router.push(`/rfi/${rfi.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Edit"
                        onClick={() => router.push(`/builder/${rfi.id}`)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete"
                        onClick={() => handleDelete(rfi.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
