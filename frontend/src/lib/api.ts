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
  content: { projectData?: any; html?: string; css?: string; formDefinition?: any; surveyDefinition?: any } | null;
  is_published: boolean;
  publish_key: string | null;
  workspace_id: string | null;
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
  content: { html?: string; css?: string; surveyDefinition?: any } | null;
}

export function getEditPath(rfi: Pick<RFI, "id" | "content">): string {
  if (rfi.content?.surveyDefinition) return `/surveyjs/${rfi.id}`;
  if (rfi.content?.formDefinition) return `/forms/${rfi.id}`;
  return `/builder/${rfi.id}`;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  created_by: string;
  rfi_count: number;
  created_at: string;
  updated_at: string;
}

// ── RFI API ──

export async function fetchRFIs(status?: string): Promise<RFI[]> {
  const params = status ? `?status=${status}` : "";
  const res = await fetch(`${API_BASE}/rfis/${params}`);
  if (!res.ok) throw new Error("Failed to fetch RFIs");
  return res.json();
}

export async function fetchRFI(id: string): Promise<RFI> {
  const res = await fetch(`${API_BASE}/rfis/${id}`);
  if (!res.ok) throw new Error("Failed to fetch RFI");
  return res.json();
}

export async function createRFI(data: {
  subject: string;
  question?: string;
  created_by: string;
  assigned_to?: string;
  content?: Record<string, any>;
  workspace_id?: string;
}): Promise<RFI> {
  const res = await fetch(`${API_BASE}/rfis/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "", ...data }),
  });
  if (!res.ok) throw new Error("Failed to create RFI");
  return res.json();
}

export async function updateRFI(
  id: string,
  data: Partial<Pick<RFI, "subject" | "question" | "status" | "assigned_to" | "content">>
): Promise<RFI> {
  const res = await fetch(`${API_BASE}/rfis/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update RFI");
  return res.json();
}

export async function deleteRFI(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/rfis/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete RFI");
}

export async function publishRFI(id: string): Promise<{ id: string; publish_key: string; is_published: boolean }> {
  const res = await fetch(`${API_BASE}/rfis/${id}/publish`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to publish RFI");
  return res.json();
}

export async function unpublishRFI(id: string): Promise<RFI> {
  const res = await fetch(`${API_BASE}/rfis/${id}/unpublish`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to unpublish RFI");
  return res.json();
}

export async function fetchSubmissions(rfiId: string): Promise<Submission[]> {
  const res = await fetch(`${API_BASE}/rfis/${rfiId}/submissions`);
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
  if (!res.ok) throw new Error("Failed to submit response");
  return res.json();
}

// ── Workspace API ──

const WS_BASE = "/rfi-api/workspaces";

export async function fetchWorkspaces(): Promise<Workspace[]> {
  const res = await fetch(`${WS_BASE}/`);
  if (!res.ok) throw new Error("Failed to fetch workspaces");
  return res.json();
}

export async function fetchWorkspace(id: string): Promise<Workspace> {
  const res = await fetch(`${WS_BASE}/${id}`);
  if (!res.ok) throw new Error("Failed to fetch workspace");
  return res.json();
}

export async function createWorkspace(data: { name: string; description?: string; created_by: string }): Promise<Workspace> {
  const res = await fetch(`${WS_BASE}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create workspace");
  return res.json();
}

export async function updateWorkspace(id: string, data: { name?: string; description?: string }): Promise<Workspace> {
  const res = await fetch(`${WS_BASE}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update workspace");
  return res.json();
}

export async function deleteWorkspace(id: string): Promise<void> {
  const res = await fetch(`${WS_BASE}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete workspace");
}

export async function fetchWorkspaceRFIs(wsId: string): Promise<RFI[]> {
  const res = await fetch(`${WS_BASE}/${wsId}/rfis`);
  if (!res.ok) throw new Error("Failed to fetch workspace RFIs");
  return res.json();
}
