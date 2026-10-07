const TOKEN_KEY = "rfi_token";
const EMAIL_KEY = "rfi_email";
const API = "/rfi-api";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getEmail(): string | null {
  try {
    return localStorage.getItem(EMAIL_KEY);
  } catch {
    return null;
  }
}

const ADMIN_KEY = "rfi_is_admin";

/** UI hint only; the backend enforces admin permissions. */
export function isAdmin(): boolean {
  try {
    return localStorage.getItem(ADMIN_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSession(token: string, email: string, admin = false) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(EMAIL_KEY, email);
    localStorage.setItem(ADMIN_KEY, admin ? "1" : "0");
  } catch {
    // storage unavailable; session will not persist
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
    localStorage.removeItem(ADMIN_KEY);
  } catch {
    // ignore
  }
}

export function signOut() {
  clearSession();
  window.location.assign("/rfi/login");
}

/** fetch with the bearer token; a 401 clears the session and sends the user to the login page. */
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401) {
    clearSession();
    if (typeof window !== "undefined" && !window.location.pathname.endsWith("/login")) {
      window.location.assign("/rfi/login");
    }
  }
  return res;
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") return body.detail;
  } catch {
    // ignore
  }
  return fallback;
}

export async function login(email: string, password: string): Promise<void> {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, "Login failed"));
  const data = await res.json();
  setSession(data.token, data.user.email, !!data.user.is_admin);
}

// ── Organisations (admin) ──

export interface OrgUser {
  id: string;
  email: string;
  is_admin: boolean;
  org_id: string | null;
}

export interface Organisation {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  users: OrgUser[];
}

async function orgJson<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) throw new Error(await errorMessage(res, fallback));
  return res.status === 204 ? (undefined as T) : res.json();
}

const jsonHeaders = { "Content-Type": "application/json" };

export async function fetchOrgs(): Promise<Organisation[]> {
  return orgJson(await apiFetch(`${API}/orgs/`), "Failed to load organisations");
}

export async function createOrg(name: string): Promise<Organisation> {
  return orgJson(
    await apiFetch(`${API}/orgs/`, { method: "POST", headers: jsonHeaders, body: JSON.stringify({ name }) }),
    "Failed to create organisation"
  );
}

export async function renameOrg(id: string, name: string): Promise<Organisation> {
  return orgJson(
    await apiFetch(`${API}/orgs/${id}`, { method: "PATCH", headers: jsonHeaders, body: JSON.stringify({ name }) }),
    "Failed to rename organisation"
  );
}

export async function deleteOrg(id: string): Promise<void> {
  return orgJson(await apiFetch(`${API}/orgs/${id}`, { method: "DELETE" }), "Failed to delete organisation");
}

export async function addOrgUser(orgId: string, email: string, password: string, admin: boolean): Promise<OrgUser> {
  return orgJson(
    await apiFetch(`${API}/orgs/${orgId}/users`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ email, password, is_admin: admin }),
    }),
    "Failed to add user"
  );
}

export async function removeOrgUser(orgId: string, userId: string): Promise<void> {
  return orgJson(await apiFetch(`${API}/orgs/${orgId}/users/${userId}`, { method: "DELETE" }), "Failed to remove user");
}

export async function resetOrgUserPassword(orgId: string, userId: string, newPassword: string): Promise<void> {
  return orgJson(
    await apiFetch(`${API}/orgs/${orgId}/users/${userId}/reset-password`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ new_password: newPassword }),
    }),
    "Failed to reset password"
  );
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await apiFetch(`${API}/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, "Could not change password"));
}
