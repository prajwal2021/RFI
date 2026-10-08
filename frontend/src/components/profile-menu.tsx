"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Database, DatabaseBackup, ImageIcon, KeyRound, LogOut, ScrollText, Users, X } from "lucide-react";
import { changePassword, getEmail, isAdmin, signOut } from "@/lib/auth";

function ResetPasswordDialog({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next.length < 8) return setError("New password must be at least 8 characters");
    if (next !== confirm) return setError("New passwords do not match");
    setBusy(true);
    try {
      await changePassword(current, next);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change password");
    } finally {
      setBusy(false);
    }
  };

  const input =
    "w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-[420px] max-w-[92vw]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Reset password</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {done ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-gray-700 mb-5">Your password has been updated.</p>
            <button onClick={onClose} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current password</label>
              <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className={input} autoFocus autoComplete="current-password" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
              <input type="password" value={next} onChange={(e) => setNext(e.target.value)} className={input} autoComplete="new-password" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} autoComplete="new-password" required />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
                {busy ? "Saving..." : "Update password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [email, setEmail] = useState("");
  const [admin, setAdmin] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    setEmail(getEmail() || "");
    setAdmin(isAdmin());
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const initial = (email[0] || "U").toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-sm font-semibold flex items-center justify-center shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        aria-label="Profile"
        title={email}
      >
        {initial}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-60 bg-white border rounded-lg shadow-lg z-40 overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <div className="text-xs text-gray-500">Signed in as</div>
            <div className="text-sm font-medium text-gray-900 truncate">{email}</div>
          </div>
          {admin && (
            <button
              onClick={() => {
                setOpen(false);
                router.push("/manage-users");
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left"
            >
              <Users className="h-4 w-4 text-gray-400" /> Manage users
            </button>
          )}
          {admin && (
            <button
              onClick={() => {
                setOpen(false);
                window.open("/rfi/db", "_blank");
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left"
            >
              <Database className="h-4 w-4 text-gray-400" /> DB
            </button>
          )}
          {admin && (
            <button
              onClick={() => {
                setOpen(false);
                router.push("/audit");
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left"
            >
              <ScrollText className="h-4 w-4 text-gray-400" /> Audit log
            </button>
          )}
          {admin && (
            <button
              onClick={() => {
                setOpen(false);
                router.push("/backups");
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left"
            >
              <DatabaseBackup className="h-4 w-4 text-gray-400" /> Backups
            </button>
          )}
          {admin && (
            <button
              onClick={() => {
                setOpen(false);
                router.push("/images");
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left"
            >
              <ImageIcon className="h-4 w-4 text-gray-400" /> Image library
            </button>
          )}
          <button
            onClick={() => {
              setOpen(false);
              setShowReset(true);
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left"
          >
            <KeyRound className="h-4 w-4 text-gray-400" /> Reset password
          </button>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left border-t"
          >
            <LogOut className="h-4 w-4 text-gray-400" /> Sign out
          </button>
        </div>
      )}
      {showReset && <ResetPasswordDialog onClose={() => setShowReset(false)} />}
    </div>
  );
}
