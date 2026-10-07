"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { fetchRFI, fetchSubmissions, publishRFI, unpublishRFI, getEditPath, RFI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pencil, Globe, GlobeLock, Copy, ExternalLink, FileText } from "lucide-react";
import { format } from "date-fns";

const SurveyRunner = dynamic(() => import("@/components/surveyjs/survey-runner"), { ssr: false });

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
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [submissionCount, setSubmissionCount] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchRFI(id);
        setRfi(data);
        if (data.is_published) {
          const subs = await fetchSubmissions(id);
          setSubmissionCount(subs.length);
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

  const openSubmissions = () => {
    window.open(`${window.location.origin}/rfi/rfi/${id}/submissions`, "_blank");
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
                onClick={openSubmissions}
              >
                <FileText className="h-4 w-4 mr-1" />
                Responses
                {submissionCount > 0 && (
                  <span className="ml-1 rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-semibold">
                    {submissionCount}
                  </span>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(getEditPath(rfi))}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Preview Content */}
      <main className="py-8">
        {rfi.content?.surveyDefinition ? (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <SurveyRunner json={rfi.content.surveyDefinition} theme={rfi.content.surveyTheme} readOnly />
            </div>
          </div>
        ) : rfi.content?.html ? (
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
        )}
      </main>
    </div>
  );
}
