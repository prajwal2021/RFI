"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { fetchRFI, fetchSubmissions, publishRFI, unpublishRFI, RFI, Submission } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pencil, Globe, GlobeLock, Copy, ExternalLink } from "lucide-react";
import { format } from "date-fns";

const STATUS_VARIANT: Record<string, "draft" | "open" | "answered" | "closed"> = {
  draft: "draft",
  open: "open",
  answered: "answered",
  closed: "closed",
};

export default function ViewRFIPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [rfi, setRfi] = useState<RFI | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"preview" | "submissions">("preview");
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchRFI(id);
        setRfi(data);
        if (data.is_published) {
          const subs = await fetchSubmissions(id);
          setSubmissions(subs);
        }
      } catch {
        alert("Failed to load RFI");
        router.push("/");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, router]);

  const handlePublish = async () => {
    if (!rfi) return;
    setPublishing(true);
    try {
      const result = await publishRFI(rfi.id);
      setRfi({ ...rfi, is_published: true, publish_key: result.publish_key, status: "open" });
    } catch {
      alert("Failed to publish");
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!rfi) return;
    setPublishing(true);
    try {
      await unpublishRFI(rfi.id);
      setRfi({ ...rfi, is_published: false });
    } catch {
      alert("Failed to unpublish");
    } finally {
      setPublishing(false);
    }
  };

  const publicUrl = rfi?.publish_key
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/rfi/public/${rfi.publish_key}`
    : null;

  const handleCopyUrl = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading RFI...
      </div>
    );
  }

  if (!rfi) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold">{rfi.subject}</h1>
                  <Badge variant={STATUS_VARIANT[rfi.status]}>{rfi.status}</Badge>
                  {rfi.is_published && (
                    <Badge variant="open" className="bg-green-100 text-green-700">
                      <Globe className="h-3 w-3 mr-1" />
                      Published
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Created by {rfi.created_by} on{" "}
                  {format(new Date(rfi.created_at), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {rfi.is_published ? (
                <>
                  <Button variant="outline" size="sm" onClick={handleCopyUrl}>
                    <Copy className="h-4 w-4 mr-1" />
                    {copied ? "Copied!" : "Copy Link"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => publicUrl && window.open(publicUrl, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Open
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleUnpublish} disabled={publishing}>
                    <GlobeLock className="h-4 w-4 mr-1" />
                    Unpublish
                  </Button>
                </>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handlePublish}
                  disabled={publishing || !rfi.content}
                >
                  <Globe className="h-4 w-4 mr-1" />
                  {publishing ? "Publishing..." : "Publish"}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/builder/${rfi.id}`)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-6">
            <button
              className={`py-3 text-sm font-medium border-b-2 transition ${
                activeTab === "preview"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("preview")}
            >
              Preview
            </button>
            <button
              className={`py-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
                activeTab === "submissions"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
              onClick={async () => {
                setActiveTab("submissions");
                const subs = await fetchSubmissions(id);
                setSubmissions(subs);
              }}
            >
              Submissions
              {submissions.length > 0 && (
                <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-semibold">
                  {submissions.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="py-8">
        {activeTab === "preview" ? (
          rfi.content?.html ? (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                {rfi.content.css && (
                  <style dangerouslySetInnerHTML={{ __html: rfi.content.css }} />
                )}
                <div dangerouslySetInnerHTML={{ __html: rfi.content.html }} />
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4">
              <div className="bg-white rounded-lg shadow-sm border p-8">
                <h2 className="text-xl font-semibold mb-4">{rfi.subject}</h2>
                {rfi.question && (
                  <p className="text-muted-foreground whitespace-pre-wrap">{rfi.question}</p>
                )}
                <p className="mt-4 text-sm text-gray-400">No visual content yet. Click Edit to design this RFI.</p>
              </div>
            </div>
          )
        ) : (
          <div className="max-w-4xl mx-auto px-4">
            {submissions.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
                <div className="text-4xl mb-4">📭</div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No submissions yet</h3>
                <p className="text-sm text-gray-500">
                  {rfi.is_published
                    ? "Share the public link to start receiving responses."
                    : "Publish this RFI to start collecting submissions."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.map((sub, idx) => (
                  <div
                    key={sub.id}
                    className="bg-white rounded-lg shadow-sm border p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-sm font-semibold text-gray-900">
                          Submission #{submissions.length - idx}
                        </span>
                        {sub.submitted_by_name && (
                          <span className="ml-2 text-sm text-gray-600">
                            by {sub.submitted_by_name}
                          </span>
                        )}
                        {sub.submitted_by_email && (
                          <span className="ml-1 text-sm text-gray-400">
                            ({sub.submitted_by_email})
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {format(new Date(sub.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <table className="w-full text-sm">
                        <tbody>
                          {Object.entries(sub.data).map(([key, value]) => (
                            <tr key={key} className="border-b border-gray-200 last:border-0">
                              <td className="py-2 pr-4 font-medium text-gray-700 align-top w-1/3">
                                {key}
                              </td>
                              <td className="py-2 text-gray-900">
                                {Array.isArray(value)
                                  ? value.join(", ")
                                  : String(value || "—")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
