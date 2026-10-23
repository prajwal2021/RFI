"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import {
  Ban, BookOpen, Briefcase, CalendarClock, ClipboardList, FileText, GitMerge, Link2, ListTodo, Mail, MessageSquare, Pencil,
  Phone, PhoneCall, Send, Share2, StickyNote, Trash2, UserRound, Users,
} from "lucide-react";
import {
  addInterest, addRelation, Contact, Contact360, deleteContact, deleteInterest, getContact, labelOf, listContacts, logInteraction,
  mergeContacts, Meta, removeRelation, updateContact, updateInterest,
} from "@/lib/crm";
import { formatValue } from "@/lib/submission-fields";
import { btn, Card, Empty, ErrorBox, FieldLabel, HelpTip, input, JourneyBadge, Modal, OptSelect, Path, textarea, Toast, useMeta } from "@/components/crm/ui";
import { SendRfiDialog, WorkDrawer, WorkItemDialog, WorkPreset, WorkRow, WorkTableHead } from "@/components/crm/dialogs";

const CHANNEL_ICON: Record<string, React.ReactNode> = {
  call: <PhoneCall className="h-3.5 w-3.5" />, voicemail: <Phone className="h-3.5 w-3.5" />, email: <Mail className="h-3.5 w-3.5" />,
  sms: <MessageSquare className="h-3.5 w-3.5" />, note: <StickyNote className="h-3.5 w-3.5" />,
};

// ───────────────────────── Log activity composer ─────────────────────────

function LogActivity({ meta, data, onSaved }: { meta: Meta; data: Contact360; onSaved: () => void }) {
  const c = data.contact;
  const blank = {
    channel: "call", direction: "inbound", outcome: "", reason: "", course_id: "", subject: "", notes: "", duration_minutes: "",
    on_behalf_of_id: "", callback_at: "",
  };
  const [f, setF] = useState<Record<string, string>>(blank);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const isNote = f.channel === "note";

  const save = async () => {
    if (!isNote && !f.outcome) return setError("Pick an outcome so reports stay accurate");
    if (!f.subject.trim() && !f.notes.trim()) return setError("Add a subject or notes");
    setBusy(true);
    setError(null);
    try {
      await logInteraction(c.id, {
        channel: f.channel, direction: isNote ? "internal" : f.direction, outcome: isNote ? null : f.outcome || null,
        reason: f.reason || null, course_id: f.course_id || null, subject: f.subject, notes: f.notes,
        duration_minutes: f.duration_minutes ? Number(f.duration_minutes) : null, on_behalf_of_id: f.on_behalf_of_id || null,
        callback_at: f.callback_at ? new Date(f.callback_at).toISOString() : null,
      });
      setF(blank);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Log activity" icon={<PhoneCall className="h-4 w-4" />} iconColor="#2e844a"
      help="Record every conversation while you are on the call. The outcome drives the person's journey status and reports.">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1">
          {meta.channels.map((ch) => (
            <button key={ch.value} title={ch.description} onClick={() => set("channel", ch.value)}
              className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-full border text-[12px] ${f.channel === ch.value ? "bg-[#0176d3] border-[#0176d3] text-white" : "bg-white border-[#c9c9c9] text-[#444] hover:bg-[#f3f3f3]"}`}>
              {CHANNEL_ICON[ch.value]}{ch.label}
            </button>
          ))}
        </div>
        <ErrorBox text={error} />
        {!isNote && (
          <div className="grid sm:grid-cols-2 gap-3">
            <OptSelect label="Direction" opts={meta.directions.filter((d) => d.value !== "internal")} value={f.direction} onChange={(v) => set("direction", v)} />
            <OptSelect label="Outcome" required opts={meta.outcomes} value={f.outcome} onChange={(v) => set("outcome", v)} allowEmpty emptyLabel="Choose the outcome…" />
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          <OptSelect label="Reason" opts={meta.reasons} value={f.reason} onChange={(v) => set("reason", v)} allowEmpty emptyLabel="Why did they call?" />
          <label className="block">
            <FieldLabel label="Course discussed" help="Adds a course interest to the person automatically (waitlist if it is coming soon)." />
            <select value={f.course_id} onChange={(e) => set("course_id", e.target.value)} className={input}>
              <option value="">—</option>
              {meta.courses.map((co) => <option key={co.id} value={co.id}>{co.name}{co.status === "coming_soon" ? " (coming soon)" : co.status === "closed" ? " (closed)" : ""}</option>)}
            </select>
          </label>
        </div>
        <label className="block">
          <FieldLabel label="Subject" />
          <input value={f.subject} onChange={(e) => set("subject", e.target.value)} className={input} placeholder="e.g. Asked about AI course start date and cost" />
        </label>
        <label className="block">
          <FieldLabel label="Notes" help="What they asked, what you told them, and what happens next." />
          <textarea value={f.notes} onChange={(e) => set("notes", e.target.value)} rows={4} className={textarea} />
        </label>
        {!isNote && (
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="block">
              <FieldLabel label="Minutes" />
              <input type="number" min={0} value={f.duration_minutes} onChange={(e) => set("duration_minutes", e.target.value)} className={input} />
            </label>
            <label className="block">
              <FieldLabel label="Calling on behalf of" help="Parent or employer calling about someone linked to this record. The call is also logged on that person." />
              <select value={f.on_behalf_of_id} onChange={(e) => set("on_behalf_of_id", e.target.value)} className={input}>
                <option value="">— themselves —</option>
                {data.relations.map((r) => <option key={r.contact.id} value={r.contact.id}>{r.contact.name}</option>)}
              </select>
            </label>
            <label className="block">
              <FieldLabel label="Schedule callback" help="Creates a callback task assigned to you at this time." />
              <input type="datetime-local" value={f.callback_at} onChange={(e) => set("callback_at", e.target.value)} className={input} />
            </label>
          </div>
        )}
        <div className="flex justify-end">
          <button onClick={save} disabled={busy} className={btn.brand}>{busy ? "Saving…" : isNote ? "Save note" : "Log activity"}</button>
        </div>
      </div>
    </Card>
  );
}

// ───────────────────────── Timeline ─────────────────────────

const TL_FILTERS = [
  { key: "all", label: "All" },
  { key: "interaction", label: "Calls & notes" },
  { key: "rfi", label: "RFIs" },
  { key: "work", label: "Work" },
  { key: "event", label: "Changes" },
];

function Timeline({ meta, data }: { meta: Meta; data: Contact360 }) {
  const [filter, setFilter] = useState("all");
  const items = data.timeline.filter((t) =>
    filter === "all" ? true : filter === "rfi" ? t.kind.startsWith("rfi_") : filter === "work" ? t.kind.startsWith("work_") : t.kind === filter
  );
  const ev = (d: Record<string, any>): string => {
    switch (d.type) {
      case "created": return d.source === "rfi" ? `Created from RFI "${d.rfi}"` : "Contact created";
      case "updated": return `Details updated (${(d.fields || []).join(", ")})`;
      case "updated_from_rfi": return `Details learned from RFI "${d.rfi}": ${Object.keys(d.fields || {}).join(", ")}`;
      case "consent": return `Consent changed: ${Object.entries(d).filter(([k]) => k !== "type").map(([k, v]: any) => `${k.replace(/_/g, " ")} ${v?.to === "True" ? "on" : v?.to === "False" ? "off" : v?.to}`).join(", ")}`;
      case "interest_added": return `Interest added: ${d.course} (${labelOf(meta.interest_stages, d.stage)})${d.via ? ` via ${d.via}` : ""}`;
      case "stage": return `${d.course}: ${labelOf(meta.interest_stages, d.from)} → ${labelOf(meta.interest_stages, d.to)}${d.reason ? ` (${labelOf(meta.lost_reasons, d.reason)})` : ""}`;
      case "relation": return `Linked: ${labelOf(meta.relations, d.relation)} ${d.with}`;
      case "merged": return `Merged duplicate record "${d.merged}" into this one`;
      case "course_opened": return `${d.course} opened; follow-up task created`;
      default: return d.type;
    }
  };
  return (
    <Card title="Activity timeline" icon={<CalendarClock className="h-4 w-4" />} iconColor="#9050e9"
      help="Everything that happened with this person, newest first: calls, notes, RFIs sent, opened and submitted, tasks and record changes."
      bodyClass="p-0">
      <div className="flex gap-1 px-4 py-2 border-b border-[#e5e5e5] overflow-x-auto">
        {TL_FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`h-7 px-2.5 rounded text-[12px] whitespace-nowrap ${filter === f.key ? "bg-[#e3f3ff] text-[#014486] font-semibold" : "text-[#444] hover:bg-[#f3f3f3]"}`}>{f.label}</button>
        ))}
      </div>
      {items.length === 0 ? (
        <Empty text="Nothing yet." />
      ) : (
        <ol className="px-4 py-3 space-y-3">
          {items.map((t, i) => {
            const d = t.data;
            let icon = <FileText className="h-3.5 w-3.5" />;
            let color = "#747474";
            let title: React.ReactNode = "";
            let body: React.ReactNode = null;
            if (t.kind === "interaction") {
              icon = CHANNEL_ICON[d.channel] || <PhoneCall className="h-3.5 w-3.5" />;
              color = d.channel === "note" ? "#dd7a01" : "#2e844a";
              title = (
                <>
                  <b>{labelOf(meta.channels, d.channel)}</b>
                  {d.channel !== "note" && <> · {labelOf(meta.directions, d.direction)}</>}
                  {d.outcome && <> · {labelOf(meta.outcomes, d.outcome)}</>}
                  {d.subject && <> — {d.subject}</>}
                </>
              );
              body = (
                <>
                  {(d.reason || d.course || d.duration_minutes) && (
                    <div className="text-[11px] text-[#747474]">{[d.reason && labelOf(meta.reasons, d.reason), d.course, d.duration_minutes ? `${d.duration_minutes} min` : null].filter(Boolean).join(" · ")}</div>
                  )}
                  {d.notes && <div className="mt-1 whitespace-pre-wrap text-[13px]">{d.notes}</div>}
                </>
              );
            } else if (t.kind === "rfi_submitted") {
              icon = <ClipboardList className="h-3.5 w-3.5" />; color = "#0176d3"; title = <><b>Submitted RFI</b> — {d.rfi}</>;
            } else if (t.kind === "rfi_invited") {
              icon = <Send className="h-3.5 w-3.5" />; color = "#5867e8"; title = <><b>RFI link sent</b> — {d.rfi}</>;
            } else if (t.kind === "rfi_opened") {
              icon = <Link2 className="h-3.5 w-3.5" />; color = "#dd7a01"; title = <><b>Opened RFI link</b> — {d.rfi}{d.count > 1 ? ` (${d.count} times)` : ""}</>;
            } else if (t.kind === "work_created") {
              icon = <ListTodo className="h-3.5 w-3.5" />; color = "#06a59a";
              title = <><b>{labelOf(meta.work_kinds, d.kind)} #{d.number} created</b> — {d.title} <span className="text-[#747474]">({labelOf(meta.teams, d.team)})</span></>;
            } else if (t.kind === "work_closed") {
              icon = <ListTodo className="h-3.5 w-3.5" />; color = "#2e844a";
              title = <><b>{labelOf(meta.work_kinds, d.kind)} #{d.number} {labelOf(meta.work_statuses, d.status).toLowerCase()}</b> — {d.title}</>;
              body = d.resolution ? <div className="mt-1 text-[13px] whitespace-pre-wrap">{d.resolution}</div> : null;
            } else {
              icon = <Pencil className="h-3.5 w-3.5" />; title = ev(d);
            }
            return (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 h-6 w-6 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: color }}>{icon}</span>
                <div className="min-w-0 flex-1 border-b border-[#f3f3f3] pb-2">
                  <div className="text-[13px] text-[#181818]">{title}</div>
                  {body}
                  <div className="text-[11px] text-[#747474] mt-0.5" title={format(new Date(t.at), "PPpp")}>
                    {t.actor ? `${t.actor} · ` : ""}{format(new Date(t.at), "MMM d, yyyy h:mm a")} ({formatDistanceToNow(new Date(t.at), { addSuffix: true })})
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

// ───────────────────────── Edit details ─────────────────────────

function EditDialog({ meta, c, onSaved, onClose }: { meta: Meta; c: Contact; onSaved: () => void; onClose: () => void }) {
  const [f, setF] = useState<Record<string, any>>({
    ...c, emails: (c.emails || []).join(", "), phones: (c.phones || []).join(", "), date_of_birth: c.date_of_birth || "",
    street: c.address?.street || "", city: c.address?.city || "", state: c.address?.state || "", zip: c.address?.zip || "",
    owner_id: c.owner_id || "",
  });
  const [custom, setCustom] = useState<Record<string, any>>({ ...(c.custom || {}) });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const nul = (v: any) => (v === "" || v === undefined ? null : v);
      await updateContact(c.id, {
        first_name: f.first_name, last_name: f.last_name, email: f.email || "", phone: f.phone || "",
        emails: String(f.emails).split(",").map((x: string) => x.trim()).filter(Boolean),
        phones: String(f.phones).split(",").map((x: string) => x.trim()).filter(Boolean),
        r_number: nul(f.r_number), date_of_birth: nul(f.date_of_birth), preferred_language: nul(f.preferred_language),
        organization_name: nul(f.organization_name), job_title: nul(f.job_title), contact_type: f.contact_type, lifecycle: f.lifecycle,
        address: { street: f.street, city: f.city, state: f.state, zip: f.zip }, description: f.description || "",
        consent_call: !!f.consent_call, consent_email: !!f.consent_email, consent_sms: !!f.consent_sms, do_not_contact: !!f.do_not_contact,
        ...(f.owner_id ? { owner_id: f.owner_id } : { clear_owner: true }),
        custom,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
      setBusy(false);
    }
  };

  const txt = (k: string, label: string, help?: string, type = "text") => (
    <label className="block">
      <FieldLabel label={label} help={help} />
      <input type={type} value={f[k] ?? ""} onChange={(e) => set(k, e.target.value)} className={input} />
    </label>
  );

  return (
    <Modal wide title={`Edit ${c.name}`} onClose={onClose}
      footer={<><button onClick={onClose} className={btn.neutral}>Cancel</button><button onClick={save} disabled={busy} className={btn.brand}>{busy ? "Saving…" : "Save"}</button></>}>
      <div className="space-y-4">
        <ErrorBox text={error} />
        <h3 className="text-[13px] font-bold border-b border-[#e5e5e5] pb-1">Identity</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          {txt("first_name", "First name")}{txt("last_name", "Last name")}{txt("r_number", "R-number", "TTU student ID, R + 8 digits")}
          {txt("date_of_birth", "Date of birth", "", "date")}
          <label className="block"><FieldLabel label="Preferred language" />
            <select value={f.preferred_language || ""} onChange={(e) => set("preferred_language", e.target.value)} className={input}>
              <option value="">—</option>{meta.languages.map((l) => <option key={l}>{l}</option>)}
            </select></label>
          <label className="block"><FieldLabel label="Record owner" help="The person responsible for this contact's follow-up." />
            <select value={f.owner_id} onChange={(e) => set("owner_id", e.target.value)} className={input}>
              <option value="">— none —</option>{meta.people.map((p) => <option key={p.id} value={p.id}>{p.email}</option>)}
            </select></label>
        </div>
        <h3 className="text-[13px] font-bold border-b border-[#e5e5e5] pb-1">Contact methods</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {txt("phone", "Primary phone", "", "tel")}{txt("email", "Primary email", "", "email")}
          {txt("phones", "Other phones", "Comma separated. All of them are searchable.")}{txt("emails", "Other emails", "Comma separated. Used to match RFI responses.")}
        </div>
        <div className="grid sm:grid-cols-4 gap-3">{txt("street", "Street")}{txt("city", "City")}{txt("state", "State")}{txt("zip", "ZIP")}</div>
        <h3 className="text-[13px] font-bold border-b border-[#e5e5e5] pb-1">Classification</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <OptSelect label="Contact type" opts={meta.contact_types} value={f.contact_type} onChange={(v) => set("contact_type", v)} />
          <OptSelect label="Lifecycle" opts={meta.lifecycle} value={f.lifecycle} onChange={(v) => set("lifecycle", v)} help="Moves forward automatically when a course interest becomes Applied or Enrolled." />
          {txt("organization_name", "Organization / employer")}{txt("job_title", "Job title")}
        </div>
        <h3 className="text-[13px] font-bold border-b border-[#e5e5e5] pb-1">Consent</h3>
        <div className="flex flex-wrap gap-4 text-[13px]">
          {[["consent_call", "OK to call"], ["consent_email", "OK to email"], ["consent_sms", "OK to text (SMS)"]].map(([k, l]) => (
            <label key={k} className="flex items-center gap-1.5"><input type="checkbox" disabled={!!f.do_not_contact} checked={!!f[k]} onChange={(e) => set(k, e.target.checked)} className="accent-[#0176d3]" /> {l}</label>
          ))}
          <label className="flex items-center gap-1.5 text-[#ba0517] font-semibold">
            <input type="checkbox" checked={!!f.do_not_contact} onChange={(e) => set("do_not_contact", e.target.checked)} className="accent-[#ba0517]" /> Do not contact
            <HelpTip text="They asked us to stop. Blocks outbound calls, RFI links and texts, and turns off all consents." />
          </label>
        </div>
        {meta.custom_fields.length > 0 && (
          <>
            <h3 className="text-[13px] font-bold border-b border-[#e5e5e5] pb-1">Additional fields</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {meta.custom_fields.map((cf) => (
                <label key={cf.key} className="block">
                  <FieldLabel label={cf.label} help={cf.help_text} />
                  {cf.field_type === "select" ? (
                    <select value={custom[cf.key] ?? ""} onChange={(e) => setCustom({ ...custom, [cf.key]: e.target.value })} className={input}>
                      <option value="">—</option>{cf.options.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  ) : cf.field_type === "checkbox" ? (
                    <input type="checkbox" checked={!!custom[cf.key]} onChange={(e) => setCustom({ ...custom, [cf.key]: e.target.checked })} className="accent-[#0176d3]" />
                  ) : cf.field_type === "textarea" ? (
                    <textarea rows={2} value={custom[cf.key] ?? ""} onChange={(e) => setCustom({ ...custom, [cf.key]: e.target.value })} className={textarea} />
                  ) : (
                    <input
                      type={({ number: "number", date: "date", email: "email", phone: "tel", url: "url" } as Record<string, string>)[cf.field_type] || "text"}
                      value={custom[cf.key] ?? ""}
                      onChange={(e) => setCustom({ ...custom, [cf.key]: cf.field_type === "number" && e.target.value !== "" ? Number(e.target.value) : e.target.value })}
                      className={input}
                    />
                  )}
                </label>
              ))}
            </div>
          </>
        )}
        <label className="block"><FieldLabel label="About this person" help="Background that is always useful, e.g. 'Prefers calls after 5pm'." />
          <textarea rows={3} value={f.description || ""} onChange={(e) => set("description", e.target.value)} className={textarea} /></label>
      </div>
    </Modal>
  );
}

// ───────────────────────── Find another contact (relations, merge) ─────────────────────────

function ContactPicker({ excludeId, onPick }: { excludeId: string; onPick: (c: Contact) => void }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Contact[]>([]);
  useEffect(() => {
    if (q.trim().length < 2) return setRows([]);
    const t = setTimeout(() => listContacts({ q: q.trim(), limit: 8 }).then((r) => setRows(r.rows.filter((x) => x.id !== excludeId))).catch(() => setRows([])), 220);
    return () => clearTimeout(t);
  }, [q, excludeId]);
  return (
    <div>
      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, email…" className={input} />
      <ul className="mt-2 max-h-60 overflow-y-auto">
        {rows.map((c) => (
          <li key={c.id}>
            <button onClick={() => onPick(c)} className="w-full text-left px-2 py-1.5 rounded hover:bg-[#f3f9ff] text-[13px]">
              <b>{c.name}</b> <span className="text-[#747474]">{[c.phone, c.email].filter(Boolean).join(" · ")}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ───────────────────────── Page ─────────────────────────

export default function ContactPage() {
  const id = useParams().id as string;
  const router = useRouter();
  const { meta, error: metaError } = useMeta();
  const [data, setData] = useState<Contact360 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [dialog, setDialog] = useState<null | "edit" | "rfi" | "merge" | "relation" | "interest">(null);
  const [workPreset, setWorkPreset] = useState<WorkPreset | null>(null);
  const [openWork, setOpenWork] = useState<string | null>(null);
  const [mergePick, setMergePick] = useState<Contact | null>(null);
  const [relPick, setRelPick] = useState<Contact | null>(null);
  const [relType, setRelType] = useState("parent");
  const [newCourse, setNewCourse] = useState("");
  const [showAnswers, setShowAnswers] = useState<string | null>(null);

  const load = useCallback(() => {
    getContact(id).then(setData).catch((e) => setError(e.message));
  }, [id]);
  useEffect(load, [load]);

  if (error) return <div className="max-w-3xl mx-auto"><ErrorBox text={error} /><Link href="/crm/contacts" className="text-[13px] text-[#0176d3]">Back to contacts</Link></div>;
  if (!data || !meta) return <div className="p-6 text-[13px] text-[#747474]">{metaError || "Loading…"}</div>;
  const c = data.contact;
  const done = (msg: string) => {
    setToast(msg);
    setDialog(null);
    setWorkPreset(null);
    load();
  };
  const run = async (fn: () => Promise<any>, msg: string) => {
    try {
      await fn();
      done(msg);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  };
  const work = (preset: WorkPreset) => setWorkPreset({ contact_id: c.id, contact_name: c.name, ...preset });
  const openItems = data.work_items.filter((w) => !["done", "cancelled"].includes(w.status));
  const closedItems = data.work_items.filter((w) => ["done", "cancelled"].includes(w.status));

  const fact = (label: string, value: React.ReactNode, help?: string) => (
    <div className="min-w-[110px]">
      <div className="text-[11px] text-[#444] flex items-center gap-1">{label}<HelpTip text={help} /></div>
      <div className="text-[13px] text-[#181818] truncate">{value === null || value === undefined || value === "" ? "—" : value}</div>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-3">
      {c.do_not_contact && (
        <div className="rounded border border-[#ba0517] bg-[#fef1ee] px-4 py-2 text-[13px] text-[#ba0517] flex items-center gap-2">
          <Ban className="h-4 w-4" /> <b>Do not contact.</b> This person asked us to stop. Outbound calls, RFI links and texts are blocked. You can still log their inbound calls.
        </div>
      )}

      {/* Highlights */}
      <section className="rounded border border-[#dddbda] bg-white shadow-[0_2px_2px_0_rgba(0,0,0,0.06)]">
        <div className="flex flex-wrap items-start gap-3 p-4">
          <span className="h-12 w-12 rounded bg-[#5867e8] text-white text-xl font-bold flex items-center justify-center shrink-0">{(c.name[0] || "?").toUpperCase()}</span>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] text-[#444]">{labelOf(meta.contact_types, c.contact_type)} · {labelOf(meta.lifecycle, c.lifecycle)}{c.source ? ` · source: ${c.source.replace("_", " ")}` : ""}</div>
            <h1 className="text-[20px] font-bold leading-tight flex flex-wrap items-center gap-2">
              {c.name} <JourneyBadge value={c.journey} label={c.journey_label} help={c.journey_help} /> <HelpTip text={c.journey_help} />
            </h1>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => document.getElementById("log-activity")?.scrollIntoView({ behavior: "smooth" })} className={btn.brand}><PhoneCall className="h-3.5 w-3.5" /> Log a Call</button>
            <button onClick={() => work({ kind: "task" })} className={btn.neutral}><ListTodo className="h-3.5 w-3.5" /> New Task</button>
            <button onClick={() => work({ kind: "callback", title: `Call back ${c.name}` })} className={btn.neutral}><CalendarClock className="h-3.5 w-3.5" /> Callback</button>
            <button onClick={() => work({ kind: "case" })} className={btn.neutral}><Briefcase className="h-3.5 w-3.5" /> New Case</button>
            <button onClick={() => setDialog("rfi")} disabled={c.do_not_contact} className={btn.neutral}><Send className="h-3.5 w-3.5" /> Send RFI</button>
            <button onClick={() => work({ kind: "handoff", team: "rfi", category: "send_rfi", title: `RFI team: ${c.name}` })} className={btn.neutral} title="Pass this person to the RFI team with a reason and notes">
              <Share2 className="h-3.5 w-3.5" /> Send to RFI Team
            </button>
            <button onClick={() => setDialog("edit")} className={btn.neutral}><Pencil className="h-3.5 w-3.5" /> Edit</button>
            <button onClick={() => setDialog("merge")} className={btn.icon} title="Merge a duplicate into this record"><GitMerge className="h-4 w-4" /></button>
            {meta.me.is_admin && (
              <button onClick={async () => { if (!confirm(`Delete ${c.name} and all their history? This cannot be undone.`)) return; try { await deleteContact(c.id); router.push("/crm/contacts"); } catch (e) { setError(e instanceof Error ? e.message : "Delete failed"); } }} className={btn.icon} title="Delete contact (admin)">
                <Trash2 className="h-4 w-4 text-[#ba0517]" />
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-2 px-4 pb-4">
          {fact("Phone", c.phone ? <a href={`tel:${c.phone}`} className="text-[#0176d3] hover:underline">{c.phone}</a> : null, "Click to dial with your phone app or softphone.")}
          {fact("Email", c.email ? <a href={`mailto:${c.email}`} className="text-[#0176d3] hover:underline">{c.email}</a> : null)}
          {fact("R-number", c.r_number)}
          {fact("Owner", c.owner_email, "The person responsible for this contact's follow-up.")}
          {fact("Calls", data.stats.calls)}
          {fact("RFIs sent / submitted", `${data.stats.rfis_sent} / ${data.stats.rfis_submitted}`)}
          {fact("Last contacted", data.stats.last_contacted_at ? formatDistanceToNow(new Date(data.stats.last_contacted_at), { addSuffix: true }) : null)}
          <div>
            <div className="text-[11px] text-[#444] flex items-center gap-1">Consent <HelpTip text="What this person agreed to. Always check before emailing or texting." /></div>
            <div className="flex gap-1 mt-0.5">
              {[["Call", c.consent_call], ["Email", c.consent_email], ["SMS", c.consent_sms]].map(([l, ok]) => (
                <span key={l as string} className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${ok ? "bg-[#ebf7e6] text-[#2e844a]" : "bg-[#f3f3f3] text-[#939393] line-through"}`}>{l as string}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid xl:grid-cols-[320px_1fr_380px] lg:grid-cols-[300px_1fr] gap-3 items-start">
        {/* Left: details */}
        <div className="space-y-3">
          <Card title="Details" icon={<UserRound className="h-4 w-4" />} iconColor="#5867e8" actions={<button onClick={() => setDialog("edit")} className={btn.icon} title="Edit"><Pencil className="h-3.5 w-3.5" /></button>}>
            <dl className="space-y-2 text-[13px]">
              {[
                ["Date of birth", c.date_of_birth ? format(new Date(`${c.date_of_birth}T12:00:00`), "MMM d, yyyy") : null],
                ["Language", c.preferred_language],
                ["Organization", c.organization_name],
                ["Job title", c.job_title],
                ["Other phones", c.phones.join(", ")],
                ["Other emails", c.emails.join(", ")],
                ["Address", [c.address?.street, c.address?.city, c.address?.state, c.address?.zip].filter(Boolean).join(", ")],
                ...meta.custom_fields.map((cf) => [cf.label, c.custom?.[cf.key] === true ? "Yes" : c.custom?.[cf.key] === false ? "No" : c.custom?.[cf.key]]),
              ].map(([k, v]) => (
                <div key={k as string} className="grid grid-cols-[110px_1fr] gap-2 border-b border-[#f3f3f3] pb-1.5">
                  <dt className="text-[#444] text-[12px]">{k}</dt>
                  <dd className="break-words">{(v as any) || <span className="text-[#c9c9c9]">—</span>}</dd>
                </div>
              ))}
            </dl>
            {c.description && <div className="mt-3 rounded bg-[#fafaf9] border border-[#e5e5e5] p-2.5 text-[13px] whitespace-pre-wrap">{c.description}</div>}
          </Card>

          <Card title="Relationships" icon={<Users className="h-4 w-4" />} iconColor="#06a59a"
            help="Parents, students, employer contacts. A call logged 'on behalf of' someone shows on both records."
            actions={<button onClick={() => setDialog("relation")} className={btn.neutral}>Add</button>}>
            {data.relations.length === 0 ? <p className="text-[13px] text-[#747474]">No linked people.</p> : (
              <ul className="space-y-1.5">
                {data.relations.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 text-[13px]">
                    <span className="min-w-0"><span className="text-[#747474]">{labelOf(meta.relations, r.relation)}</span>{" "}
                      <Link href={`/crm/contacts/${r.contact.id}`} className="text-[#0176d3] hover:underline">{r.contact.name}</Link></span>
                    <button onClick={() => run(() => removeRelation(r.id), "Unlinked")} className="text-[#747474] hover:text-[#ba0517]" title="Remove link"><Trash2 className="h-3.5 w-3.5" /></button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Middle: activity */}
        <div className="space-y-3 min-w-0">
          <div id="log-activity"><LogActivity meta={meta} data={data} onSaved={() => done("Activity logged")} /></div>
          <Timeline meta={meta} data={data} />
        </div>

        {/* Right: related */}
        <div className="space-y-3 xl:col-span-1 lg:col-span-2 min-w-0">
          <Card title="Course interests" icon={<BookOpen className="h-4 w-4" />} iconColor="#dd7a01"
            help="Each course this person is interested in, moving along the path from Inquiry to Enrolled. Click a stage to move it."
            actions={<button onClick={() => setDialog("interest")} className={btn.neutral}>Add</button>}>
            {data.interests.length === 0 ? <p className="text-[13px] text-[#747474]">No course interests yet. They are added automatically when you log a call about a course or they pick courses in an RFI.</p> : (
              <ul className="space-y-3">
                {data.interests.map((it) => (
                  <li key={it.id}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[13px] font-semibold truncate">{it.course}{it.course_status === "coming_soon" && <span className="ml-1 text-[11px] font-normal text-[#dd7a01]">(coming soon)</span>}</span>
                      <button onClick={() => confirm(`Remove interest in ${it.course}?`) && run(() => deleteInterest(it.id), "Removed")} className="text-[#747474] hover:text-[#ba0517]"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                    <Path stages={meta.interest_stages} value={it.stage} onChange={(v) => {
                      if (v === "lost") {
                        const reason = prompt(`Why was ${it.course} lost?\n${meta.lost_reasons.map((r) => `${r.value} — ${r.label}`).join("\n")}`, "timing");
                        if (!reason) return;
                        run(() => updateInterest(it.id, { stage: "lost", lost_reason: reason.trim() }), "Marked lost");
                      } else run(() => updateInterest(it.id, { stage: v }), `Moved to ${labelOf(meta.interest_stages, v)}`);
                    }} />
                    {it.lost_reason && <div className="text-[11px] text-[#ba0517] mt-1">Lost: {labelOf(meta.lost_reasons, it.lost_reason)}</div>}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={`Open work (${openItems.length})`} icon={<ListTodo className="h-4 w-4" />} iconColor="#06a59a" bodyClass="p-0"
            help="Tasks, callbacks, cases and handoffs for this person that are not finished.">
            {openItems.length === 0 ? <Empty text="Nothing open." /> : (
              <div className="overflow-x-auto"><table className="w-full"><WorkTableHead showContact={false} /><tbody>
                {openItems.map((w) => <WorkRow key={w.id} meta={meta} w={w} showContact={false} onOpen={() => setOpenWork(w.id)} />)}
              </tbody></table></div>
            )}
            {closedItems.length > 0 && <div className="px-3 py-2 text-[12px] text-[#747474] border-t border-[#e5e5e5]">{closedItems.length} closed item(s) are on the timeline.</div>}
          </Card>

          <Card title="RFIs" icon={<ClipboardList className="h-4 w-4" />} help="Personal RFI links sent to this person and every RFI response linked to them.">
            {data.invitations.length === 0 && data.submissions.length === 0 ? (
              <Empty text="No RFIs yet.">
                {!c.do_not_contact && <button onClick={() => setDialog("rfi")} className={btn.neutral}><Send className="h-3.5 w-3.5" /> Send RFI</button>}
              </Empty>
            ) : (
              <div className="space-y-3 text-[13px]">
                {data.invitations.map((inv) => (
                  <div key={inv.id} className="rounded border border-[#e5e5e5] p-2.5">
                    <div className="font-semibold">{inv.rfi}</div>
                    <div className="text-[11px] text-[#444] mt-0.5 space-x-2">
                      <span>Sent {format(new Date(inv.created_at), "MMM d")} by {inv.sent_by}</span>
                      <span className={inv.opened_at ? "text-[#dd7a01]" : "text-[#939393]"}>{inv.opened_at ? `Opened ${format(new Date(inv.opened_at), "MMM d")}` : "Not opened"}</span>
                      <span className={inv.submitted_at ? "text-[#2e844a] font-semibold" : "text-[#939393]"}>{inv.submitted_at ? `Submitted ${format(new Date(inv.submitted_at), "MMM d")}` : "Not submitted"}</span>
                    </div>
                    {inv.publish_key && !inv.submitted_at && (
                      <button onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/rfi/public/${inv.publish_key}?i=${inv.token}`); setToast("Link copied"); } catch { setToast("Copy failed"); } }}
                        className="mt-1 text-[12px] text-[#0176d3] hover:underline">Copy their link again</button>
                    )}
                  </div>
                ))}
                {data.submissions.map((s) => (
                  <div key={s.id} className="rounded border border-[#e5e5e5] p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold">Response: {s.rfi}</div>
                      <span className="text-[11px] text-[#444]">{format(new Date(s.created_at), "MMM d, yyyy")}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1 text-[12px]">
                      {s.can_view ? (
                        <button onClick={() => setShowAnswers(showAnswers === s.id ? null : s.id)} className="text-[#0176d3] hover:underline">{showAnswers === s.id ? "Hide answers" : "Show answers"}</button>
                      ) : <span className="text-[#747474]">Answers are in a workspace you cannot see</span>}
                      <button onClick={() => work({ kind: "handoff", team: "rfi", category: "rfi_question", title: `Question about ${c.name}'s response`, rfi_id: s.rfi_id })} className="text-[#0176d3] hover:underline">Ask the RFI team</button>
                    </div>
                    {showAnswers === s.id && s.data && (
                      <dl className="mt-2 space-y-1">
                        {Object.entries(s.data).map(([k, v]) => (
                          <div key={k} className="grid grid-cols-[120px_1fr] gap-2 text-[12px]"><dt className="text-[#444] truncate" title={k}>{k}</dt><dd className="break-words">{formatValue(v)}</dd></div>
                        ))}
                      </dl>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* dialogs */}
      {dialog === "edit" && <EditDialog meta={meta} c={c} onClose={() => setDialog(null)} onSaved={() => done("Saved")} />}
      {dialog === "rfi" && <SendRfiDialog contact={c} onClose={() => { setDialog(null); load(); }} onSent={() => setToast("Personal link created")} />}
      {workPreset && <WorkItemDialog meta={meta} preset={workPreset} onClose={() => setWorkPreset(null)} onCreated={(w) => done(`${labelOf(meta.work_kinds, w.kind)} #${w.number} created`)} />}
      {openWork && <WorkDrawer meta={meta} id={openWork} onClose={() => setOpenWork(null)} onChanged={load} />}
      {dialog === "interest" && (
        <Modal title="Add course interest" onClose={() => setDialog(null)}
          footer={<><button onClick={() => setDialog(null)} className={btn.neutral}>Cancel</button>
            <button disabled={!newCourse} onClick={() => run(() => addInterest(c.id, newCourse), "Interest added")} className={btn.brand}>Add</button></>}>
          <label className="block"><FieldLabel label="Course" help="Coming-soon courses go on the waitlist; you will get a task when the course opens." />
            <select value={newCourse} onChange={(e) => setNewCourse(e.target.value)} className={input}>
              <option value="">Choose…</option>
              {meta.courses.filter((co) => !data.interests.some((i) => i.course_id === co.id) && co.status !== "closed").map((co) => (
                <option key={co.id} value={co.id}>{co.name}{co.status === "coming_soon" ? " (coming soon)" : ""}</option>
              ))}
            </select></label>
        </Modal>
      )}
      {dialog === "relation" && (
        <Modal title="Link a related person" onClose={() => { setDialog(null); setRelPick(null); }}
          footer={relPick ? <><button onClick={() => setRelPick(null)} className={btn.neutral}>Back</button>
            <button onClick={() => run(() => addRelation(c.id, relPick.id, relType), "Linked")} className={btn.brand}>Link</button></> : undefined}>
          {!relPick ? <ContactPicker excludeId={c.id} onPick={setRelPick} /> : (
            <div className="space-y-3 text-[13px]">
              <OptSelect label={`${c.name} is…`} opts={meta.relations} value={relType} onChange={setRelType} />
              <div>… <b>{relPick.name}</b></div>
              <p className="text-[12px] text-[#747474]">Not in the system yet? Create them from the global search first, then link them here.</p>
            </div>
          )}
        </Modal>
      )}
      {dialog === "merge" && (
        <Modal title={`Merge a duplicate into ${c.name}`} onClose={() => { setDialog(null); setMergePick(null); }}
          footer={mergePick ? <><button onClick={() => setMergePick(null)} className={btn.neutral}>Back</button>
            <button onClick={() => run(() => mergeContacts(c.id, mergePick.id), `Merged ${mergePick.name}`)} className={btn.brand}>Merge</button></> : undefined}>
          {!mergePick ? (
            <div className="space-y-2 text-[13px]"><p className="text-[#444]">Find the duplicate record. Its calls, tasks, RFIs and interests move here and the duplicate is removed.</p>
              <ContactPicker excludeId={c.id} onPick={setMergePick} /></div>
          ) : (
            <div className="text-[13px] space-y-2">
              <p>Merge <b>{mergePick.name}</b> ({[mergePick.phone, mergePick.email].filter(Boolean).join(" · ")}) into <b>{c.name}</b>?</p>
              <p className="text-[#747474]">Empty fields on {c.name} are filled from the duplicate; extra emails and phones are kept. This cannot be undone.</p>
            </div>
          )}
        </Modal>
      )}
      {toast && <Toast text={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
