"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowLeft, DatabaseBackup, Download, HardDriveDownload, RefreshCw, ShieldAlert } from "lucide-react";
import AppHeader from "@/components/app-header";
import { isAdmin } from "@/lib/auth";
import { BackupList, downloadBackup, fetchBackups, runBackup } from "@/lib/admin";

function size(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function BackupsPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [data, setData] = useState<BackupList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyFile, setBusyFile] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const countRef = useRef(0);

  useEffect(() => {
    setAllowed(isAdmin());
  }, []);

  const load = useCallback(async () => {
    try {
      const d = await fetchBackups();
      setData(d);
      setError(null);
      return d;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load backups");
      return null;
    }
  }, []);

  useEffect(() => {
    if (allowed) load().then((d) => d && (countRef.current = d.items.length));
  }, [allowed, load]);

  // After "Back up now", poll until a new file appears (the backup service checks every ~10s).
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(async () => {
      const d = await load();
      if (d && d.items.length > countRef.current) {
        countRef.current = d.items.length;
        setWaiting(false);
      }
    }, 4000);
    const stop = setTimeout(() => setWaiting(false), 120000);
    return () => {
      clearInterval(t);
      clearTimeout(stop);
    };
  }, [waiting, load]);

  const backupNow = async () => {
    setBusy(true);
    setError(null);
    try {
      countRef.current = data?.items.length ?? 0;
      await runBackup();
      setWaiting(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start backup");
    } finally {
      setBusy(false);
    }
  };

  const download = async (name: string) => {
    setBusyFile(name);
    try {
      await downloadBackup(name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setBusyFile(null);
    }
  };

  if (allowed === null) return null;
  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center bg-white border border-slate-200 rounded-xl shadow-sm p-10 max-w-sm">
          <ShieldAlert className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-slate-900 mb-1">Admin access required</h1>
          <p className="text-sm text-slate-500">Only administrators can manage backups.</p>
        </div>
      </div>
    );
  }

  const latest = data?.items[0];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <AppHeader
        left={
          <button onClick={() => router.push("/")} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </button>
        }
      />
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-8 py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-900">
              <DatabaseBackup className="h-5 w-5 text-indigo-500" /> Backups
            </h1>
            <p className="text-sm text-slate-500">
              The database is backed up automatically every day and the 14 most recent backups are kept.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="h-9 w-9 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 flex items-center justify-center"
              aria-label="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={backupNow}
              disabled={busy || waiting || data?.available === false}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium shadow-sm hover:opacity-90 disabled:opacity-60"
            >
              <HardDriveDownload className="h-4 w-4" /> {waiting ? "Backing up…" : "Back up now"}
            </button>
          </div>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {data?.available === false && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Backup storage is not mounted on the server, so backups are unavailable.
          </div>
        )}

        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Last backup</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">
              {latest ? formatDistanceToNow(new Date(latest.created_at), { addSuffix: true }) : "—"}
            </div>
            {latest && <div className="text-xs text-slate-400">{format(new Date(latest.created_at), "MMM d, yyyy HH:mm")}</div>}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Stored backups</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">{data?.items.length ?? "—"}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Latest size</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">{latest ? size(latest.size) : "—"}</div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {!data ? (
            <div className="px-5 py-12 text-center text-sm text-slate-400">Loading…</div>
          ) : data.items.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-400">No backups yet. The first one is created when the backup service starts.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="px-5 py-2.5 font-medium">Backup</th>
                  <th className="px-5 py-2.5 font-medium">Created</th>
                  <th className="px-5 py-2.5 font-medium">Size</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {data.items.map((b) => (
                  <tr key={b.name} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-3 font-mono text-xs text-slate-700">{b.name}</td>
                    <td className="px-5 py-3 text-slate-600">{format(new Date(b.created_at), "MMM d, yyyy HH:mm")}</td>
                    <td className="px-5 py-3 text-slate-600 tabular-nums">{size(b.size)}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => download(b.name)}
                        disabled={busyFile === b.name}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        <Download className="h-3.5 w-3.5" /> {busyFile === b.name ? "Downloading…" : "Download"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">Restoring a backup</h2>
          <p className="text-sm text-slate-500 mb-3">
            Restores are done on the server so they can never happen by accident from the web app. Copy the backup file to the server&apos;s
            backups folder if needed, then run:
          </p>
          <pre className="text-xs bg-slate-900 text-slate-100 rounded-lg p-3 overflow-x-auto">
{`cd /opt/rfi
cat backups/<file>.dump | docker exec -i rfi-db pg_restore -U rfi_user -d rfi_db --clean --if-exists --no-owner`}
          </pre>
        </div>
      </main>
    </div>
  );
}
