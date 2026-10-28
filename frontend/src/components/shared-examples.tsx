"use client";

import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { apiFetch } from "@/lib/auth";

interface Ws {
  id: string;
  name: string;
  owner_email: string | null;
  rfi_count: number;
  is_example: boolean;
}

/** Admin only: tick a workspace to share its forms with every account as read-only examples (people copy them to use them). */
export default function SharedExamples() {
  const [rows, setRows] = useState<Ws[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    apiFetch("/rfi-api/orgs/shared/workspaces")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Could not load workspaces"))))
      .then(setRows)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const toggle = async (w: Ws, on: boolean) => {
    setError(null);
    const res = await apiFetch(`/rfi-api/orgs/shared/workspaces/${w.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_example: on }),
    });
    if (!res.ok) setError("Could not update. Try again.");
    await load();
  };

  return (
    <div className="mt-8 rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <BookOpen className="h-4 w-4 text-amber-500" /> Shared examples
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Tick a workspace to show its forms to <b>every account</b> as read-only examples. People click <b>Use as template</b> to get their own editable copy. Responses to example forms stay private to the owner. Images are already shared with everyone through the image library.
        </p>
      </div>
      {error && <div className="px-5 py-2 text-sm text-red-600">{error}</div>}
      {!rows ? (
        <div className="px-5 py-6 text-sm text-slate-400">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="px-5 py-6 text-sm text-slate-400">No workspaces yet.</div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((w) => (
            <li key={w.id}>
              <label className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-slate-50">
                <input type="checkbox" checked={w.is_example} onChange={(e) => toggle(w, e.target.checked)} className="h-4 w-4 accent-amber-500" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-slate-900 truncate">{w.name}</span>
                  <span className="block text-xs text-slate-500 truncate">{w.owner_email || "no owner"} · {w.rfi_count} form{w.rfi_count === 1 ? "" : "s"}</span>
                </span>
                {w.is_example && <span className="text-xs font-medium text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">Shared</span>}
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
