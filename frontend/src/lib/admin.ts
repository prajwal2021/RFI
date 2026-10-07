import { apiFetch } from "@/lib/auth";
import { download } from "@/lib/export";

const BASE = "/rfi-api/admin";

async function parse<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    let detail = fallback;
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") detail = body.detail;
    } catch {
      // keep fallback
    }
    throw new Error(detail);
  }
  return res.json();
}

// ── Audit log ──

export interface AuditEntry {
  id: string;
  created_at: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  details: Record<string, any> | null;
}

export interface AuditPage {
  total: number;
  limit: number;
  offset: number;
  rows: AuditEntry[];
}

export async function fetchAudit(opts: { limit: number; offset: number; action: string; q: string }): Promise<AuditPage> {
  const p = new URLSearchParams({ limit: String(opts.limit), offset: String(opts.offset) });
  if (opts.action) p.set("action", opts.action);
  if (opts.q.trim()) p.set("q", opts.q.trim());
  return parse(await apiFetch(`${BASE}/audit/?${p.toString()}`), "Failed to load audit log");
}

export async function fetchAuditActions(): Promise<string[]> {
  return parse(await apiFetch(`${BASE}/audit/actions`), "Failed to load actions");
}

// ── Backups ──

export interface BackupItem {
  name: string;
  size: number;
  created_at: string;
}

export interface BackupList {
  available: boolean;
  items: BackupItem[];
  pending: boolean;
}

export async function fetchBackups(): Promise<BackupList> {
  return parse(await apiFetch(`${BASE}/backups/`), "Failed to load backups");
}

export async function runBackup(): Promise<void> {
  await parse(await apiFetch(`${BASE}/backups/run`, { method: "POST" }), "Failed to start backup");
}

export async function downloadBackup(name: string): Promise<void> {
  const res = await apiFetch(`${BASE}/backups/${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error("Download failed");
  const buf = new Uint8Array(await res.arrayBuffer());
  download(name, buf, "application/octet-stream");
}
