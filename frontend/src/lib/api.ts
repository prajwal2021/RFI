const API_BASE = "/api";

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
  content: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  responses: RFIResponse[];
}

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

export async function addResponse(
  rfiId: string,
  data: { answer: string; responded_by: string }
): Promise<RFIResponse> {
  const res = await fetch(`${API_BASE}/rfis/${rfiId}/responses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to add response");
  return res.json();
}
