import { apiFetch } from "@/lib/auth";

const BASE = "/rfi-api/admin/db";

export interface DbColumn {
  name: string;
  type: string;
  nullable: boolean;
  primary_key: boolean;
  foreign_key: boolean;
}

export interface DbTable {
  name: string;
  row_count: number;
  columns: DbColumn[];
}

export interface DbRows {
  name: string;
  total: number;
  limit: number;
  offset: number;
  columns: string[];
  rows: Record<string, any>[];
}

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

export async function fetchDbTables(): Promise<DbTable[]> {
  return parse(await apiFetch(`${BASE}/tables`), "Failed to load tables");
}

export async function fetchDbRows(name: string, limit: number, offset: number): Promise<DbRows> {
  return parse(
    await apiFetch(`${BASE}/tables/${encodeURIComponent(name)}?limit=${limit}&offset=${offset}`),
    "Failed to load records"
  );
}
