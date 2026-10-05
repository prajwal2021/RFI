"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import type { GrapesEditorRef, EditorContent } from "@/components/builder/editor";
import { fetchRFI, updateRFI, publishRFI } from "@/lib/api";

const GrapesEditor = dynamic(() => import("@/components/builder/editor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center bg-gray-900 text-gray-300">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-500 border-t-blue-500 mx-auto" />
        <p>Loading Editor...</p>
      </div>
    </div>
  ),
});

export default function EditBuilderPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const editorRef = useRef<GrapesEditorRef>(null);

  const [subject, setSubject] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [initialContent, setInitialContent] = useState<EditorContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishUrl, setPublishUrl] = useState<string | null>(null);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchRFI(id).then((rfi) => {
      setSubject(rfi.subject);
      if (rfi.content?.projectData) {
        setInitialContent(rfi.content as EditorContent);
      }
      setLoading(false);
    });
  }, [id]);

  const handleSave = useCallback(async () => {
    const content = editorRef.current?.getContent();
    if (!content) return;
    setSaving(true);
    try {
      await updateRFI(id, { subject, content });
    } catch {
      alert("Failed to save");
    } finally {
      setSaving(false);
    }
  }, [id, subject]);

  const handlePublish = useCallback(async () => {
    const content = editorRef.current?.getContent();
    if (!content) return;
    setPublishing(true);
    try {
      await updateRFI(id, { subject, content });
      const result = await publishRFI(id);
      const base = window.location.origin;
      const url = `${base}/rfi/public/${result.publish_key}`;
      setPublishUrl(url);
      setShowPublishDialog(true);
    } catch {
      alert("Failed to publish");
    } finally {
      setPublishing(false);
    }
  }, [id, subject]);

  const handleCopy = () => {
    if (publishUrl) {
      navigator.clipboard.writeText(publishUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-gray-300">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-500 border-t-blue-500 mx-auto" />
          <p>Loading RFI...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-700 bg-gray-900 px-4 py-2 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="rounded-md px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 transition"
          >
            &larr; Back
          </button>
          <div className="h-5 w-px bg-gray-700" />
          {editingTitle ? (
            <input
              autoFocus
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
              className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white outline-none focus:border-blue-500"
            />
          ) : (
            <button
              onClick={() => setEditingTitle(true)}
              className="text-sm font-medium text-white hover:text-blue-400 transition flex items-center gap-1"
              title="Click to rename"
            >
              {subject}
              <span className="text-gray-500 text-xs ml-1">(click to rename)</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md border border-gray-600 px-4 py-1.5 text-sm font-medium text-gray-300 hover:bg-gray-700 disabled:opacity-50 transition"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="rounded-md bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition"
          >
            {publishing ? "Publishing..." : "Publish"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <GrapesEditor ref={editorRef} initialContent={initialContent} />
      </div>

      {showPublishDialog && publishUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl mx-4">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Published!</h3>
            <p className="mb-4 text-sm text-gray-600">
              Your RFI is now live. Share this URL with respondents:
            </p>
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <input
                readOnly
                value={publishUrl}
                className="flex-1 bg-transparent text-sm text-gray-800 outline-none"
              />
              <button
                onClick={handleCopy}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition shrink-0"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPublishDialog(false)}
                className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 transition"
              >
                Close
              </button>
              <button
                onClick={() => router.push(`/rfi/${id}`)}
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition"
              >
                View RFI
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
