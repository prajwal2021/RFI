import { apiFetch } from "@/lib/auth";

const BASE = "/rfi-api/crm";

export interface Opt {
  value: string;
  label: string;
  description: string;
}

export interface Course {
  id: string;
  name: string;
  code: string | null;
  category: string | null;
  status: string;
  starts_on: string | null;
  description: string;
  url: string | null;
  interested?: number;
  enrolled?: number;
  waitlist?: number;
}

export interface CustomField {
  id: string;
  key: string;
  label: string;
  field_type: string;
  options: string[];
  help_text: string;
  position: number;
}

export interface Meta {
  channels: Opt[];
  directions: Opt[];
  outcomes: Opt[];
  reasons: Opt[];
  contact_types: Opt[];
  lifecycle: Opt[];
  interest_stages: Opt[];
  lost_reasons: Opt[];
  work_kinds: Opt[];
  teams: Opt[];
  work_statuses: Opt[];
  priorities: Opt[];
  case_categories: Opt[];
  handoff_reasons: Opt[];
  relations: Opt[];
  languages: string[];
  course_statuses: Opt[];
  custom_field_types: Opt[];
  journey: Opt[];
  people: { id: string; email: string }[];
  me: { id: string; email: string; is_admin: boolean; is_rfi_user?: boolean; is_call_center_user?: boolean; rfi_only?: boolean };
  custom_fields: CustomField[];
  courses: Course[];
}

export interface Contact {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  emails: string[];
  phones: string[];
  r_number: string | null;
  date_of_birth: string | null;
  preferred_language: string | null;
  organization_name: string | null;
  job_title: string | null;
  address: Record<string, string>;
  contact_type: string;
  lifecycle: string;
  source: string | null;
  owner_id: string | null;
  owner_email: string | null;
  do_not_contact: boolean;
  consent_email: boolean;
  consent_sms: boolean;
  consent_call: boolean;
  description: string;
  custom: Record<string, any>;
  created_at: string | null;
  updated_at: string | null;
  journey: string | null;
  journey_label: string | null;
  journey_help: string | null;
  last_activity_at?: string | null;
}

export interface WorkItem {
  id: string;
  number: number;
  kind: string;
  team: string;
  category: string | null;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_at: string | null;
  overdue: boolean;
  owner_id: string | null;
  owner_email: string | null;
  created_by_email: string | null;
  contact_id: string | null;
  contact_name: string | null;
  rfi_id: string | null;
  submission_id: string | null;
  resolution: string;
  created_at: string | null;
  updated_at: string | null;
  closed_at: string | null;
  rfi_subject?: string | null;
  shared_response?: { label: string; value: string }[] | null;
  comments?: { id: string; author_email: string | null; kind: string; text: string; created_at: string }[];
}

export interface TimelineEntry {
  at: string;
  kind: "interaction" | "work_created" | "work_closed" | "rfi_submitted" | "rfi_invited" | "rfi_opened" | "event";
  actor: string | null;
  data: Record<string, any>;
}

export interface Contact360 {
  contact: Contact;
  stats: { calls: number; interactions: number; rfis_submitted: number; rfis_sent: number; open_work: number; last_contacted_at: string | null };
  interests: { id: string; course_id: string; course: string; course_status: string; stage: string; source: string | null; lost_reason: string | null; updated_at: string | null }[];
  relations: { id: string; relation: string; contact: { id: string; name: string; phone: string | null; email: string | null } }[];
  work_items: WorkItem[];
  submissions: { id: string; rfi_id: string; rfi: string; created_at: string; status: string; data: Record<string, any> | null; can_view: boolean }[];
  invitations: {
    id: string; rfi_id: string; rfi: string; token: string; publish_key: string | null; is_published: boolean; channel: string;
    sent_by: string | null; created_at: string; opened_at: string | null; open_count: number; submitted_at: string | null;
  }[];
  timeline: TimelineEntry[];
}

export class CrmError extends Error {
  status: number;
  detail: any;
  constructor(status: number, detail: any, message: string) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

async function req<T>(path: string, init: RequestInit = {}, fallback = "Request failed"): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && typeof init.body === "string") headers.set("Content-Type", "application/json");
  const res = await apiFetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    let detail: any = null;
    try {
      detail = (await res.json())?.detail;
    } catch {
      // ignore
    }
    const msg =
      typeof detail === "string"
        ? detail
        : detail?.message || (Array.isArray(detail) && detail[0]?.msg ? String(detail[0].msg).replace(/^Value error, /, "") : fallback);
    throw new CrmError(res.status, detail, msg);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

const body = (o: any) => JSON.stringify(o);

let metaCache: Promise<Meta> | null = null;
export function fetchMeta(force = false): Promise<Meta> {
  if (!metaCache || force) metaCache = req<Meta>("/meta", {}, "Failed to load settings").catch((e) => {
    metaCache = null;
    throw e;
  });
  return metaCache;
}

export const labelOf = (opts: Opt[] | undefined, v: string | null | undefined) => opts?.find((o) => o.value === v)?.label || v || "—";
export const helpOf = (opts: Opt[] | undefined, v: string | null | undefined) => opts?.find((o) => o.value === v)?.description || "";

export const listContacts = (p: Record<string, string | number>) =>
  req<{ total: number; rows: Contact[] }>(`/contacts?${new URLSearchParams(Object.entries(p).map(([k, v]) => [k, String(v)])).toString()}`);
export const getContact = (id: string) => req<Contact360>(`/contacts/${id}`, {}, "Contact not found");
export const getContactSummary = (id: string) =>
  req<{ contact: Contact; calls: number; open_work: number; last_interaction: { at: string; channel: string; outcome: string | null; agent: string | null } | null }>(`/contacts/${id}/summary`);
export const createContact = (data: Partial<Contact> & { force?: boolean }) => req<Contact>("/contacts", { method: "POST", body: body(data) });
export const updateContact = (id: string, data: Record<string, any>) => req<Contact>(`/contacts/${id}`, { method: "PATCH", body: body(data) });
export const deleteContact = (id: string) => req<void>(`/contacts/${id}`, { method: "DELETE" });
export const mergeContacts = (targetId: string, sourceId: string) => req<{ ok: boolean }>(`/contacts/${targetId}/merge`, { method: "POST", body: body({ source_id: sourceId }) });
export const addRelation = (id: string, related_id: string, relation: string) => req(`/contacts/${id}/relations`, { method: "POST", body: body({ related_id, relation }) });
export const removeRelation = (rid: string) => req<void>(`/relations/${rid}`, { method: "DELETE" });
export const logInteraction = (id: string, data: Record<string, any>) => req(`/contacts/${id}/interactions`, { method: "POST", body: body(data) });
export const deleteInteraction = (iid: string) => req<void>(`/interactions/${iid}`, { method: "DELETE" });
export const addInterest = (id: string, course_id: string, stage = "inquiry") => req(`/contacts/${id}/interests`, { method: "POST", body: body({ course_id, stage }) });
export const updateInterest = (iid: string, data: { stage?: string; lost_reason?: string }) => req(`/interests/${iid}`, { method: "PATCH", body: body(data) });
export const deleteInterest = (iid: string) => req<void>(`/interests/${iid}`, { method: "DELETE" });
export const sendableRfis = () => req<{ id: string; subject: string; publish_key: string }[]>("/rfis");
export const createInvitation = (id: string, rfi_id: string, channel = "link") =>
  req<{ id: string; token: string; path: string }>(`/contacts/${id}/invitations`, { method: "POST", body: body({ rfi_id, channel }) });

export const listWork = (p: Record<string, string>) => req<WorkItem[]>(`/work?${new URLSearchParams(p).toString()}`);
export const getWork = (id: string) => req<WorkItem>(`/work/${id}`);
export const createWork = (data: Record<string, any>) => req<WorkItem>("/work", { method: "POST", body: body(data) });
export const updateWork = (id: string, data: Record<string, any>) => req<WorkItem>(`/work/${id}`, { method: "PATCH", body: body(data) });
export const commentWork = (id: string, text: string) => req(`/work/${id}/comments`, { method: "POST", body: body({ text }) });

export const getHome = () => req<{ stats: Record<string, any>; recent_contacts: Contact[] }>("/home");
export const getTeam = () =>
  req<{
    people: { id: string; email: string; open: number; in_progress: number; overdue: number; closed_week: number; calls_today: number; calls_week: number }[];
    queues: { team: string; label: string; unassigned: number; open: number; overdue: number; oldest_unassigned_at: string | null }[];
    stalled: WorkItem[];
  }>("/team");

export const listCourses = () => req<Course[]>("/courses");
export const createCourse = (data: Partial<Course>) => req<Course>("/courses", { method: "POST", body: body(data) });
export const updateCourse = (id: string, data: Partial<Course>) => req<Course & { waitlist_tasks_created: number }>(`/courses/${id}`, { method: "PATCH", body: body(data) });
export const deleteCourse = (id: string) => req<void>(`/courses/${id}`, { method: "DELETE" });

export const createField = (data: Partial<CustomField>) => req<CustomField>("/custom-fields", { method: "POST", body: body(data) });
export const updateField = (id: string, data: Partial<CustomField>) => req<CustomField>(`/custom-fields/${id}`, { method: "PATCH", body: body(data) });
export const deleteField = (id: string) => req<void>(`/custom-fields/${id}`, { method: "DELETE" });

export const JOURNEY_STYLE: Record<string, string> = {
  new: "bg-slate-100 text-slate-700 border-slate-200",
  called_no_rfi: "bg-sky-50 text-sky-700 border-sky-200",
  rfi_sent: "bg-indigo-50 text-indigo-700 border-indigo-200",
  rfi_opened: "bg-amber-50 text-amber-800 border-amber-200",
  responded_not_contacted: "bg-red-50 text-red-700 border-red-200",
  responded_after_call: "bg-emerald-50 text-emerald-700 border-emerald-200",
  responded_contacted: "bg-teal-50 text-teal-700 border-teal-200",
  enrolled: "bg-green-100 text-green-800 border-green-300",
  lost: "bg-zinc-100 text-zinc-500 border-zinc-200",
  do_not_contact: "bg-red-100 text-red-800 border-red-300",
};

export const PRIORITY_STYLE: Record<string, string> = {
  low: "text-slate-500",
  normal: "text-slate-700",
  high: "text-amber-700 font-semibold",
  urgent: "text-red-700 font-bold",
};

export function toLocalInput(iso: string | null | undefined, withTime = true): string {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  const day = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  return withTime ? `${day}T${p(d.getHours())}:${p(d.getMinutes())}` : day;
}
