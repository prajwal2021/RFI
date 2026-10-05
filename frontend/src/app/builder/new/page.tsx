"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { GrapesEditorRef } from "@/components/builder/editor";
import { createRFI } from "@/lib/api";

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

export default function NewBuilderPage() {
  const router = useRouter();
  const editorRef = useRef<GrapesEditorRef>(null);
  const [saving, setSaving] = useState(false);
  const [subject, setSubject] = useState("Untitled RFI");
  const [editingTitle, setEditingTitle] = useState(false);

  const handleSave = async () => {
    const content = editorRef.current?.getContent();
    if (!content) return;
    setSaving(true);
    try {
      const rfi = await createRFI({
        subject,
        created_by: "admin",
        content,
      });
      router.push(`/builder/${rfi.id}`);
    } catch {
      alert("Failed to save RFI");
    } finally {
      setSaving(false);
    }
  };

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
            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {saving ? "Saving..." : "Save RFI"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <GrapesEditor ref={editorRef} />
      </div>
    </div>
  );
}
