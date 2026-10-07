import { apiFetch } from "@/lib/auth";

const API_BASE = "/rfi-api";

export interface RFIResponse {
  id: string;
  rfi_id: string;
  answer: string;
  responded_by: string;
  created_at: string;
}

export interface RFI {
  id: string;
  subject: string;
  question: string;
  status: "draft" | "open" | "answered" | "closed";
  created_by: string;
  assigned_to: string | null;
  content: { projectData?: any; html?: string; css?: string; formDefinition?: any; surveyDefinition?: any; surveyTheme?: any; surveyEditor?: string } | null;
  is_published: boolean;
  publish_key: string | null;
  workspace_id: string | null;
  opens_at: string | null;
  closes_at: string | null;
  max_responses: number | null;
  thank_you_message: string | null;
  created_at: string;
  updated_at: string;
  responses: RFIResponse[];
}

export interface Submission {
  id: string;
  rfi_id: string;
  data: Record<string, any>;
  submitted_by_name: string | null;
  submitted_by_email: string | null;
  created_at: string;
}

export interface PublicRFI {
  subject: string;
  content: { html?: string; css?: string; surveyDefinition?: any; surveyTheme?: any } | null;
  thank_you_message?: string | null;
  opens_at?: string | null;
  closes_at?: string | null;
  accepting?: boolean;
  closed_reason?: string | null;
}

/** Editor route for an item, or null when it has no editor (e.g. legacy Visual RFI items). */
export function getEditPath(rfi: Pick<RFI, "id" | "content">): string | null {
  if (rfi.content?.surveyDefinition) {
    return rfi.content.surveyEditor === "clone" ? `/surveyjs-clone/${rfi.id}` : `/surveyjs/${rfi.id}`;
  }
  if (rfi.content?.formDefinition) return `/forms/${rfi.id}`;
  return null;
}

export interface SubmissionWithRFI extends Submission {
  rfi_subject: string;
}

export async function fetchAllSubmissions(): Promise<SubmissionWithRFI[]> {
  const res = await apiFetch(`${API_BASE}/submissions/`);
  if (!res.ok) throw new Error("Failed to fetch responses");
  return res.json();
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  created_by: string;
  visibility: "private" | "org";
  owner_email: string | null;
  is_owner: boolean;
  rfi_count: number;
  created_at: string;
  updated_at: string;
}

export interface Me {
  id: string;
  email: string;
  is_admin: boolean;
  org_id: string | null;
  org_name: string | null;
}

export async function fetchMe(): Promise<Me> {
  const res = await apiFetch(`${API_BASE}/auth/me`);
  if (!res.ok) throw new Error("Failed to load profile");
  return res.json();
}

// ── RFI API ──

export async function fetchRFIs(status?: string): Promise<RFI[]> {
  const params = status ? `?status=${status}` : "";
  const res = await apiFetch(`${API_BASE}/rfis/${params}`);
  if (!res.ok) throw new Error("Failed to fetch RFIs");
  return res.json();
}

export async function fetchRFI(id: string): Promise<RFI> {
  const res = await apiFetch(`${API_BASE}/rfis/${id}`);
  if (!res.ok) throw new Error("Failed to fetch RFI");
  return res.json();
}

export async function createRFI(data: {
  subject: string;
  question?: string;
  created_by?: string;
  assigned_to?: string;
  content?: Record<string, any>;
  workspace_id?: string;
}): Promise<RFI> {
  const res = await apiFetch(`${API_BASE}/rfis/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "", ...data }),
  });
  if (!res.ok) throw new Error("Failed to create RFI");
  return res.json();
}

export async function updateRFI(
  id: string,
  data: Partial<Pick<RFI, "subject" | "question" | "status" | "assigned_to" | "content" | "opens_at" | "closes_at" | "max_responses" | "thank_you_message">>
): Promise<RFI> {
  const res = await apiFetch(`${API_BASE}/rfis/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    let detail = "Failed to update RFI";
    try {
      const body = await res.json();
      if (Array.isArray(body?.detail) && body.detail[0]?.msg) detail = String(body.detail[0].msg).replace(/^Value error, /, "");
      else if (typeof body?.detail === "string") detail = body.detail;
    } catch {
      // keep default
    }
    throw new Error(detail);
  }
  return res.json();
}

export async function deleteRFI(id: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/rfis/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete RFI");
}

export async function publishRFI(id: string): Promise<{ id: string; publish_key: string; is_published: boolean }> {
  const res = await apiFetch(`${API_BASE}/rfis/${id}/publish`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to publish RFI");
  return res.json();
}

export async function unpublishRFI(id: string): Promise<RFI> {
  const res = await apiFetch(`${API_BASE}/rfis/${id}/unpublish`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to unpublish RFI");
  return res.json();
}

export async function fetchSubmissions(rfiId: string): Promise<Submission[]> {
  const res = await apiFetch(`${API_BASE}/rfis/${rfiId}/submissions`);
  if (!res.ok) throw new Error("Failed to fetch submissions");
  return res.json();
}

export async function fetchPublicRFI(publishKey: string): Promise<PublicRFI> {
  const res = await fetch(`${API_BASE}/rfis/public/${publishKey}`);
  if (!res.ok) throw new Error("RFI not found or not published");
  return res.json();
}

export async function submitPublicRFI(
  publishKey: string,
  data: { data: Record<string, any>; submitted_by_name?: string; submitted_by_email?: string }
): Promise<Submission> {
  const res = await fetch(`${API_BASE}/rfis/public/${publishKey}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    let detail = "Failed to submit response";
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") detail = body.detail;
    } catch {
      // keep default
    }
    throw new Error(detail);
  }
  return res.json();
}

// ── Workspace API ──

const WS_BASE = "/rfi-api/workspaces";

export async function fetchWorkspaces(): Promise<Workspace[]> {
  const res = await apiFetch(`${WS_BASE}/`);
  if (!res.ok) throw new Error("Failed to fetch workspaces");
  return res.json();
}

export async function fetchWorkspace(id: string): Promise<Workspace> {
  const res = await apiFetch(`${WS_BASE}/${id}`);
  if (!res.ok) throw new Error("Failed to fetch workspace");
  return res.json();
}

export async function createWorkspace(data: {
  name: string;
  description?: string;
  visibility: "private" | "org";
}): Promise<Workspace> {
  const res = await apiFetch(`${WS_BASE}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    let detail = "Failed to create workspace";
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") detail = body.detail;
    } catch {
      // keep default message
    }
    throw new Error(detail);
  }
  return res.json();
}

export async function updateWorkspace(id: string, data: { name?: string; description?: string }): Promise<Workspace> {
  const res = await apiFetch(`${WS_BASE}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update workspace");
  return res.json();
}

export async function deleteWorkspace(id: string): Promise<void> {
  const res = await apiFetch(`${WS_BASE}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete workspace");
}

export async function fetchWorkspaceRFIs(wsId: string): Promise<RFI[]> {
  const res = await apiFetch(`${WS_BASE}/${wsId}/rfis`);
  if (!res.ok) throw new Error("Failed to fetch workspace RFIs");
  return res.json();
}

// ── Analytics ──

export interface AnalyticsDay {
  date: string;
  created: { id: string; subject: string }[];
  responses: { rfi_id: string; subject: string; count: number }[];
  created_count: number;
  responses_count: number;
}

export interface Analytics {
  days: AnalyticsDay[];
  totals: { forms: number; published: number; responses: number };
}

export async function fetchAnalytics(days: number): Promise<Analytics> {
  let tz = "UTC";
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    // fall back to UTC
  }
  const res = await apiFetch(`${API_BASE}/analytics/?days=${days}&tz=${encodeURIComponent(tz)}`);
  if (!res.ok) throw new Error("Failed to load analytics");
  return res.json();
}
