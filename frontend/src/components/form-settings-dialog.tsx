"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { RFI, updateRFI } from "@/lib/api";

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const input =
  "w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";

export default function FormSettingsDialog({
  rfi,
  responseCount,
  onClose,
  onSaved,
}: {
  rfi: RFI;
  responseCount: number;
  onClose: () => void;
  onSaved: (updated: RFI) => void;
}) {
  const [opensAt, setOpensAt] = useState(toLocalInput(rfi.opens_at));
  const [closesAt, setClosesAt] = useState(toLocalInput(rfi.closes_at));
  const [maxResponses, setMaxResponses] = useState(rfi.max_responses ? String(rfi.max_responses) : "");
  const [thanks, setThanks] = useState(rfi.thank_you_message || "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const max = maxResponses.trim() === "" ? null : Number(maxResponses);
    if (max !== null && (!Number.isInteger(max) || max < 1)) return setError("Response limit must be a whole number of at least 1");
    if (opensAt && closesAt && new Date(closesAt) <= new Date(opensAt)) return setError("Close date must be after the open date");
    setBusy(true);
    try {
      const updated = await updateRFI(rfi.id, {
        opens_at: opensAt ? new Date(opensAt).toISOString() : null,
        closes_at: closesAt ? new Date(closesAt).toISOString() : null,
        max_responses: max,
        thank_you_message: thanks.trim() ? thanks.trim() : null,
      });
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Form settings</h2>
            <p className="text-xs text-slate-500">Control when and how this form accepts responses.</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Opens</label>
              <input type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} className={input} />
              <p className="mt-1 text-xs text-slate-400">Leave empty to open immediately.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Closes</label>
              <input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} className={input} />
              <p className="mt-1 text-xs text-slate-400">Leave empty to stay open.</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Response limit</label>
            <input
              type="number"
              min={1}
              value={maxResponses}
              onChange={(e) => setMaxResponses(e.target.value)}
              placeholder="Unlimited"
              className={input}
            />
            <p className="mt-1 text-xs text-slate-400">
              {responseCount} response{responseCount === 1 ? "" : "s"} so far. The form closes automatically at the limit.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Thank-you message</label>
            <textarea
              value={thanks}
              onChange={(e) => setThanks(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Thank you for your response. Your submission has been recorded."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
            <p className="mt-1 text-xs text-slate-400">Shown to respondents after they submit.</p>
          </div>

          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/60 rounded-b-xl">
          <button type="button" onClick={onClose} className="h-10 px-5 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium shadow-sm hover:opacity-90 disabled:opacity-60">
            {busy ? "Saving…" : "Save settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
