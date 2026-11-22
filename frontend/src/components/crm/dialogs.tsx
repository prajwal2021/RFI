"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { AlertTriangle, CheckCircle2, ChevronDown, Copy, ExternalLink, Hand, Send, Undo2, UserRound, X } from "lucide-react";
import {
  commentWork, Contact, createContact, createInvitation, createWork, CrmError, getContactSummary, getWork, labelOf, Meta, PRIORITY_STYLE,
  sendableRfis, toLocalInput, updateWork, WorkItem,
} from "@/lib/crm";
import { btn, ErrorBox, FieldLabel, input, Modal, OptSelect, textarea } from "@/components/crm/ui";

// ───────────────────────── New contact ─────────────────────────

export function NewContactDialog({
  meta, initial, onCreated, onClose,
}: {
  meta: Meta; initial?: Partial<Contact>; onCreated: (c: Contact) => void; onClose: () => void;
}) {
  const [f, setF] = useState({
    first_name: "", last_name: "", email: "", phone: "", r_number: "", date_of_birth: "", organization_name: "",
    contact_type: "prospect", preferred_language: "English", consent_call: true, consent_email: false, consent_sms: false,
    ...Object.fromEntries(Object.entries(initial || {}).filter(([, v]) => v !== null && v !== undefined)),
  } as Record<string, any>);
  const [dup, setDup] = useState<Contact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [more, setMore] = useState(!!(initial?.r_number || initial?.organization_name));
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  const needsPhone = !!(f.consent_call || f.consent_sms) && !String(f.phone || "").trim();

  const needsEmail = !!f.consent_email && !String(f.email || "").trim();

  const save = async (force = false) => {
    if (needsPhone) {
      setError("Enter a phone number, or untick OK to call / OK to text.");
      return;
    }
    if (needsEmail) {
      setError("Enter an email address, or untick OK to email.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload: Record<string, any> = { ...f, force };
      for (const k of ["email", "phone", "r_number", "date_of_birth", "organization_name"]) if (!payload[k]) payload[k] = null;
      onCreated(await createContact(payload));
    } catch (e) {
      if (e instanceof CrmError && e.status === 409 && e.detail?.contact) setDup(e.detail.contact);
      else setError(e instanceof Error ? e.message : "Could not create the contact");
    } finally {
      setBusy(false);
    }
  };

  const txt = (k: string, label: string, help?: string, type = "text", placeholder = "") => (
    <label className="block">
      <FieldLabel label={label} help={help} />
      <input type={type} value={f[k] || ""} placeholder={placeholder} onChange={(e) => set(k, e.target.value)} className={input} />
    </label>
  );

  return (
    <Modal
      title="Add a new person"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className={btn.neutral}>Cancel</button>
          <button onClick={() => save(false)} disabled={busy} className={btn.brand}>{busy ? "Saving…" : "Save and open"}</button>
        </>
      }
    >
      {dup ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-[#fe9339] bg-[#fef6ec] p-3 text-[13px]">
            <b>This person may already exist.</b> We found a contact with the same email, phone or R-number. Open the existing record to avoid duplicates.
          </div>
          <div className="rounded-lg border border-[#e2d7c0] p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold text-[14px]">{dup.name}</div>
              <div className="text-[12px] text-[#6f6654] truncate">{[dup.phone, dup.email, dup.r_number].filter(Boolean).join(" · ")}</div>
            </div>
            <Link href={`/crm/contacts/${dup.id}`} className={btn.brand} onClick={onClose}>Open existing</Link>
          </div>
          <div className="flex justify-between items-center text-[13px]">
            <button onClick={() => setDup(null)} className="text-[#1b5038] hover:underline">Back to the form</button>
            <button onClick={() => save(true)} disabled={busy} className={btn.neutral}>They are a different person — create anyway</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <ErrorBox text={error} />
          <div className="grid sm:grid-cols-2 gap-3">
            {txt("first_name", "First name")}
            {txt("last_name", "Last name")}
            <label className="block">
              <FieldLabel label="Phone" help="Any format. Used to recognise the caller next time." />
              <input type="tel" value={f.phone || ""} placeholder="(806) 555-0123" onChange={(e) => set("phone", e.target.value)} className={`${input} ${needsPhone ? "border-[#fe9339] ring-1 ring-[#fe9339]" : ""}`} />
            </label>
            <label className="block">
              <FieldLabel label="Email" />
              <input type="email" value={f.email || ""} placeholder="name@example.com" onChange={(e) => set("email", e.target.value)} className={`${input} ${needsEmail ? "border-[#fe9339] ring-1 ring-[#fe9339]" : ""}`} />
            </label>
          </div>
          <OptSelect label="Who are they?" opts={meta.contact_types} value={f.contact_type} onChange={(v) => set("contact_type", v)} />
          <button type="button" onClick={() => setMore(!more)} className="text-[12px] font-medium text-[#1b5038] hover:underline">
            {more ? "Hide extra details" : "+ R-number, date of birth, employer, language"}
          </button>
          {more && (
            <div className="grid sm:grid-cols-2 gap-3 rounded-lg border border-[#ebe2d0] bg-[#fbf8f2] p-3">
              {txt("r_number", "R-number", "TTU student ID, e.g. R12345678. Leave blank for prospects.", "text", "R12345678")}
              {txt("date_of_birth", "Date of birth", "Use to confirm identity before discussing records.", "date")}
              {txt("organization_name", "Organization / employer", "Their employer, school district or partner organization.")}
              <label className="block">
                <FieldLabel label="Preferred language" />
                <select value={f.preferred_language} onChange={(e) => set("preferred_language", e.target.value)} className={input}>
                  {meta.languages.map((l) => <option key={l}>{l}</option>)}
                </select>
              </label>
            </div>
          )}
          <fieldset className="rounded-lg border border-[#ebe2d0] p-3">
            <legend className="px-1 text-[12px] text-[#4f483d]">Consent (ask the caller)</legend>
            <div className="flex flex-wrap gap-4 text-[13px]">
              {[["consent_call", "OK to call"], ["consent_email", "OK to email"], ["consent_sms", "OK to text (SMS)"]].map(([k, l]) => (
                <label key={k} className="flex items-center gap-1.5">
                  <input type="checkbox" checked={!!f[k]} onChange={(e) => set(k, e.target.checked)} className="accent-[#1b5038]" /> {l}
                </label>
              ))}
            </div>
            {needsPhone && <div role="alert" className="mt-2 flex items-start gap-1.5 rounded-lg border border-[#fe9339] bg-[#fef6ec] px-2.5 py-1.5 text-[12px] text-[#7a4a00]"><AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" /><span><b>Add a phone number.</b> You ticked a phone option (call or text), so this person needs a phone number we can reach them on.</span></div>}
            {needsEmail && <div role="alert" className="mt-2 flex items-start gap-1.5 rounded-lg border border-[#fe9339] bg-[#fef6ec] px-2.5 py-1.5 text-[12px] text-[#7a4a00]"><AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" /><span><b>Add an email address.</b> You ticked OK to email, so this person needs an email address we can reach them on.</span></div>}
          </fieldset>
        </div>
      )}
    </Modal>
  );
}

// ───────────────────────── New work item ─────────────────────────

export interface WorkPreset {
  kind?: string;
  team?: string;
  category?: string;
  contact_id?: string;
  contact_name?: string;
  submission_id?: string;
  rfi_id?: string;
  title?: string;
  description?: string;
}

// Reasons that make sense for each receiving team, so the list stays short.
const HANDOFF_REASONS_FOR: Record<string, string[]> = {
  rfi: ["send_rfi", "info_request", "enrollment_interest", "rfi_question", "other"],
  call_center: ["call_request", "rfi_question", "escalation", "other"],
  escalations: ["escalation", "other"],
};

export function WorkItemDialog({ meta, preset, onCreated, onClose }: { meta: Meta; preset: WorkPreset; onCreated: (w: WorkItem) => void; onClose: () => void }) {
  const isHandoff = preset.kind === "handoff";
  const [f, setF] = useState({
    kind: preset.kind || "task", team: preset.team || (isHandoff ? "rfi" : "call_center"), category: preset.category || "", title: preset.title || "",
    description: preset.description || "", priority: "normal", due_at: "", owner_id: isHandoff || preset.kind === "case" ? "" : meta.me.id,
  });
  const [shareResponse, setShareResponse] = useState(!!preset.submission_id);
  const [advanced, setAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const cats = f.kind === "case" ? meta.case_categories
    : f.kind === "handoff" ? meta.handoff_reasons.filter((r) => (HANDOFF_REASONS_FOR[f.team] || []).includes(r.value)) : null;
  const teamLabel = labelOf(meta.teams, f.team);

  const save = async () => {
    if (!f.title.trim()) return setError("Give it a short summary");
    setBusy(true);
    setError(null);
    try {
      onCreated(await createWork({
        ...f, category: f.category || null, owner_id: f.owner_id || null, due_at: f.due_at ? new Date(f.due_at).toISOString() : null,
        contact_id: preset.contact_id || null, submission_id: preset.submission_id || null, rfi_id: preset.rfi_id || null,
        share_response: !!preset.submission_id && shareResponse,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
      setBusy(false);
    }
  };

  const titleFor: Record<string, string> = {
    task: "New task", callback: "Schedule a callback", case: "New case (ticket)",
    handoff: f.team === "call_center" ? "Ask the Call Center to call" : `Send to ${teamLabel}`,
  };

  return (
    <Modal
      title={preset.kind ? titleFor[f.kind] : "New work item"}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className={btn.neutral}>Cancel</button>
          <button onClick={save} disabled={busy} className={btn.brand}>
            {busy ? "Sending…" : isHandoff ? <><Send className="h-3.5 w-3.5" /> Send to {teamLabel}</> : "Save"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <ErrorBox text={error} />
        {(preset.contact_name || isHandoff) && (
          <div className="rounded-lg border border-[#ebe2d0] bg-[#fbf8f2] px-3 py-2 text-[12px] text-[#4f483d]">
            {preset.contact_name && <>About <b className="text-[#1f2a22]">{preset.contact_name}</b>. </>}
            {isHandoff && <>It goes to the <b className="text-[#1f2a22]">{teamLabel} queue</b>; everyone on that team is notified and you&apos;ll hear back when it&apos;s done.</>}
          </div>
        )}
        {!preset.kind && (
          <div className="grid sm:grid-cols-2 gap-3">
            <OptSelect label="Type" opts={meta.work_kinds} value={f.kind} onChange={(v) => { set("kind", v); set("category", ""); }} />
            <OptSelect label="Team" opts={meta.teams.filter((t) => t.value !== "escalations")} value={f.team} onChange={(v) => { set("team", v); set("category", ""); }}
              help="Which team's queue this belongs to. Leave Assigned to empty to put it in that team's queue." />
          </div>
        )}
        {cats && (
          <OptSelect label={f.kind === "case" ? "Category" : "What do you need?"} opts={cats} value={f.category} onChange={(v) => set("category", v)} allowEmpty emptyLabel="Choose…" />
        )}
        <label className="block">
          <FieldLabel label="Short summary" required />
          <input value={f.title} onChange={(e) => set("title", e.target.value)} className={input} placeholder={f.kind === "callback" ? "Call back about AI course start date" : "One line the other person will see in their list"} />
        </label>
        <label className="block">
          <FieldLabel label={isHandoff ? `Note for the ${teamLabel}` : "Details"} help="Everything the next person needs so they don't have to call back and ask again." />
          <textarea value={f.description} onChange={(e) => set("description", e.target.value)} rows={4} className={textarea}
            placeholder={isHandoff && f.team === "rfi" ? "e.g. Interested in the AI microcertificate starting next term. Please send the program form." : ""} />
        </label>
        {preset.submission_id && (
          <label className="flex items-start gap-2 rounded-lg border border-[#cfe3d6] bg-[#eef5f0] px-3 py-2 text-[13px] cursor-pointer">
            <input type="checkbox" checked={shareResponse} onChange={(e) => setShareResponse(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#1b5038]" />
            <span>
              <b>Attach their RFI answers</b>
              <span className="block text-[12px] text-[#4f483d]">The agent can read what they submitted before calling.</span>
            </span>
          </label>
        )}
        <div>
          <FieldLabel label="Priority" />
          <div className="flex flex-wrap gap-1.5">
            {meta.priorities.map((p) => (
              <button key={p.value} type="button" title={p.description} onClick={() => set("priority", p.value)}
                className={`h-8 px-3 rounded-full border text-[12px] font-medium ${f.priority === p.value ? "bg-[#1b5038] border-[#1b5038] text-white" : "bg-white border-[#e2d7c0] text-[#4f483d] hover:border-[#1b5038]"}`}>
                {p.label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-[#6f6654]">{meta.priorities.find((p) => p.value === f.priority)?.description}</p>
        </div>
        <button type="button" onClick={() => setAdvanced(!advanced)} className="text-[12px] font-medium text-[#1b5038] hover:underline">
          {advanced ? "Hide due date and assignee" : "+ Set a due date or assign to someone"}
        </button>
        {advanced && (
          <div className="grid sm:grid-cols-2 gap-3 rounded-lg border border-[#ebe2d0] bg-[#fbf8f2] p-3">
            <label className="block">
              <FieldLabel label="Due" help="Cases and hand-offs get a due date from the priority if you leave this empty." />
              <input type="datetime-local" value={f.due_at} onChange={(e) => set("due_at", e.target.value)} className={input} />
            </label>
            <label className="block">
              <FieldLabel label="Assigned to" help="Empty = the team queue, for anyone on the team to pick up." />
              <select value={f.owner_id} onChange={(e) => set("owner_id", e.target.value)} className={input}>
                <option value="">{teamLabel} queue (anyone)</option>
                {meta.people.map((p) => <option key={p.id} value={p.id}>{p.email}{p.id === meta.me.id ? " (me)" : ""}</option>)}
              </select>
            </label>
          </div>
        )}
      </div>
    </Modal>
  );
}

/** A small "More" dropdown for secondary actions, so the main buttons stay few and obvious. */
export function MoreMenu({ items }: { items: { label: string; icon?: React.ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean }[] }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);
  return (
    <div className="relative">
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(!open); }} className={btn.neutral} aria-haspopup="menu" aria-expanded={open}>
        More <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-1 z-50 w-52 rounded-xl border border-[#ebe2d0] bg-white py-1 shadow-lift">
          {items.map((it) => (
            <button key={it.label} role="menuitem" disabled={it.disabled} onClick={() => { setOpen(false); it.onClick(); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[13px] disabled:opacity-40 ${it.danger ? "text-[#ba0517] hover:bg-red-50" : "text-[#1f2a22] hover:bg-[#f5efe3]"}`}>
              {it.icon}{it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── Send RFI (personal link) ─────────────────────────

export function SendRfiDialog({ contact, onSent, onClose }: { contact: Pick<Contact, "id" | "name" | "email" | "first_name">; onSent: (msg: string) => void; onClose: () => void }) {
  const [rfis, setRfis] = useState<{ id: string; subject: string }[] | null>(null);
  const [rfiId, setRfiId] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState<string | null>(contact.email);
  useEffect(() => {
    if (!contact.email) getContactSummary(contact.id).then((s) => setEmail(s.contact.email)).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact.id]);

  useEffect(() => {
    sendableRfis().then((r) => {
      setRfis(r);
      if (r[0]) setRfiId(r[0].id);
    }).catch((e) => setError(e.message));
  }, []);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const inv = await createInvitation(contact.id, rfiId, "link");
      setLink(`${window.location.origin}${inv.path}`);
      const closed = inv.closed_requests || [];
      onSent(closed.length ? `Link created; request #${closed.join(", #")} marked done` : "Personal link created");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the link");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Modal title={`Send an RFI to ${contact.name}`} onClose={onClose} footer={<button onClick={onClose} className={btn.neutral}>Close</button>}>
      <div className="space-y-3 text-[13px]">
        <ol className="rounded-lg border border-[#ebe2d0] bg-[#fbf8f2] p-3 space-y-1 text-[12px] text-[#4f483d] list-decimal list-inside">
          <li>Pick the form and create a <b>personal link</b> for {contact.name}.</li>
          <li>Copy it into an email, or use <b>Open in my email app</b>.</li>
          <li>Their record shows when they open and submit it, even if they type a different email. Any open &ldquo;send an RFI&rdquo; request for them is closed for you.</li>
        </ol>
        <ErrorBox text={error} />
        {!link ? (
          <>
            {rfis === null ? (
              <p className="text-[#6f6654]">Loading forms…</p>
            ) : rfis.length === 0 ? (
              <p className="text-[#6f6654]">No published forms are available to you yet. Publish a form first (your <b>Starter templates</b> workspace has ready-made ones), or ask the RFI team.</p>
            ) : (
              <label className="block">
                <FieldLabel label="Form" help="Only published forms you have access to are listed." />
                <select value={rfiId} onChange={(e) => setRfiId(e.target.value)} className={input}>
                  {rfis.map((r) => <option key={r.id} value={r.id}>{r.subject}</option>)}
                </select>
              </label>
            )}
            <div className="flex justify-end">
              <button onClick={create} disabled={busy || !rfiId} className={btn.brand}>
                <Send className="h-3.5 w-3.5" /> {busy ? "Creating…" : "Create personal link"}
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <FieldLabel label="Personal link" help="Read it out, paste it into an email or chat. Email and SMS sending arrive once the no-reply address and Twilio are connected." />
            <div className="flex gap-2">
              <input readOnly value={link} className={`${input} font-mono text-[12px]`} onFocus={(e) => e.target.select()} />
              <button onClick={copy} className={btn.neutral}><Copy className="h-3.5 w-3.5" /> {copied ? "Copied" : "Copy"}</button>
            </div>
            <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#1b5038] hover:underline">
              Preview the form <ExternalLink className="h-3 w-3" />
            </a>
            {email && (
              <a
                href={`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent("Information you requested from TTU Online")}&body=${encodeURIComponent(`Hello ${contact.first_name || ""},\n\nPlease fill out this short form so we can help you:\n${link}\n\nThank you,\nTTU Online`)}`}
                className="inline-flex items-center gap-1 ml-4 text-[#1b5038] hover:underline"
              >
                Open in my email app <Send className="h-3 w-3" />
              </a>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ───────────────────────── Work item drawer ─────────────────────────

export function WorkDrawer({ meta, id, onClose, onChanged }: { meta: Meta; id: string; onClose: () => void; onChanged: () => void }) {
  const [w, setW] = useState<WorkItem | null>(null);
  const [comment, setComment] = useState("");
  const [resolution, setResolution] = useState("");
  const [editing, setEditing] = useState(false);
  const [tDraft, setTDraft] = useState("");
  const [dDraft, setDDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);

  const load = () => getWork(id).then((x) => { setW(x); setResolution(x.resolution || ""); }).catch((e) => setError(e.message));
  useEffect(() => {
    setW(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const patch = async (data: Record<string, any>) => {
    setBusy(true);
    setError(null);
    try {
      await updateWork(id, data);
      await load();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  const addComment = async () => {
    if (!comment.trim()) return;
    setBusy(true);
    try {
      await commentWork(id, comment.trim());
      setComment("");
      await load();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not comment");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[55] flex justify-end bg-black/30" onMouseDown={onClose}>
      <aside className="w-full max-w-lg h-full bg-white shadow-2xl overflow-y-auto" onMouseDown={(e) => e.stopPropagation()}>
        {!w ? (
          <div className="p-6 text-[13px] text-[#6f6654]">{error || "Loading…"}</div>
        ) : (
          <>
            <div className="sticky top-0 bg-[#f5efe3] border-b border-[#e2d7c0] px-5 py-3 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] uppercase tracking-wide text-[#6f6654]">
                  {labelOf(meta.work_kinds, w.kind)} #{w.number} · {labelOf(meta.teams, w.team)}
                </div>
                <h2 className="text-[16px] font-bold text-[#1f2a22] break-words">{w.title}</h2>
                {w.contact_id && (
                  <Link href={`/crm/contacts/${w.contact_id}`} className="text-[13px] text-[#1b5038] hover:underline" onClick={onClose}>
                    {w.contact_name || "Open contact"}
                  </Link>
                )}
              </div>
              <button onClick={onClose} className="text-[#6f6654] hover:text-[#1f2a22]" aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-4 text-[13px]">
              <ErrorBox text={error} />
              {(() => {
                const closed = ["done", "cancelled"].includes(w.status);
                const rfiAsk = w.kind === "handoff" && w.team === "rfi" && !!w.contact_id;
                const callAsk = !!w.contact_id && (w.kind === "callback" || (w.kind === "handoff" && w.team === "call_center"));
                const guide = closed
                  ? null
                  : rfiAsk ? "Next step: send them a form with Send RFI link. This request closes by itself and the sender is told."
                  : callAsk ? "Next step: open the person and log your call. When you reach them, this closes by itself and the sender is told."
                  : !w.owner_id ? "This is waiting in the queue. Pick it up so the team knows you have it." : null;
                return (
                  <>
                    {closed ? (
                      <div className="flex items-start gap-2 rounded-lg border border-[#cfe3d6] bg-[#eef5f0] px-3 py-2 text-[#163f2d]">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                        <span><b>{labelOf(meta.work_statuses, w.status)}</b>{w.resolution ? `: ${w.resolution}` : ""}</span>
                      </div>
                    ) : guide && (
                      <div className="rounded-lg border border-[#d9c7ff] bg-[#f4edff] px-3 py-2 text-[12px] text-[#3b1680]">{guide}</div>
                    )}
                    {!closed && (
                      <div className="flex flex-wrap gap-2">
                        {!w.owner_id && <button disabled={busy} onClick={() => patch({ claim: true })} className={btn.brand}><Hand className="h-3.5 w-3.5" /> Pick up</button>}
                        {rfiAsk && <button disabled={busy} onClick={() => setSending(true)} className={btn.accent}><Send className="h-3.5 w-3.5" /> Send RFI link</button>}
                        {callAsk && (
                          <Link href={`/crm/contacts/${w.contact_id}?log=1`} onClick={onClose} className={btn.accent}><UserRound className="h-3.5 w-3.5" /> Open person &amp; log call</Link>
                        )}
                        <button disabled={busy} onClick={() => patch({ status: "done", resolution })} className={btn.neutral}><CheckCircle2 className="h-3.5 w-3.5" /> Mark done</button>
                        {w.owner_id && <button disabled={busy} onClick={() => patch({ unassign: true })} className={btn.neutral}><Undo2 className="h-3.5 w-3.5" /> Return to queue</button>}
                      </div>
                    )}
                  </>
                );
              })()}
              {sending && w.contact_id && (
                <SendRfiDialog
                  contact={{ id: w.contact_id, name: w.contact_name || "this person", email: null, first_name: "" }}
                  onSent={() => { load(); onChanged(); }}
                  onClose={() => setSending(false)}
                />
              )}
              <div className="grid grid-cols-2 gap-3">
                <OptSelect label="Status" opts={meta.work_statuses} value={w.status} onChange={(v) => patch({ status: v, resolution })} />
                <OptSelect label="Priority" opts={meta.priorities} value={w.priority} onChange={(v) => patch({ priority: v })} />
                <label className="block">
                  <FieldLabel label="Assigned to" />
                  <select value={w.owner_id || ""} onChange={(e) => (e.target.value ? patch({ owner_id: e.target.value }) : patch({ unassign: true }))} className={input}>
                    <option value="">Team queue (unassigned)</option>
                    {meta.people.map((p) => <option key={p.id} value={p.id}>{p.email}</option>)}
                  </select>
                </label>
                <OptSelect label="Team" opts={meta.teams.filter((t) => t.value !== "escalations" || w.team === "escalations")} value={w.team} onChange={(v) => patch({ team: v })} />
                <label className="block col-span-2">
                  <FieldLabel label="Due" />
                  <input
                    type="datetime-local"
                    value={toLocalInput(w.due_at)}
                    onChange={(e) => (e.target.value ? patch({ due_at: new Date(e.target.value).toISOString() }) : patch({ clear_due: true }))}
                    className={`${input} ${w.overdue ? "border-[#ba0517] text-[#ba0517]" : ""}`}
                  />
                </label>
              </div>
              {w.category && (
                <div>
                  <span className="text-[12px] text-[#4f483d]">{w.kind === "case" ? "Category" : "Reason"}: </span>
                  <b>{labelOf(w.kind === "case" ? meta.case_categories : meta.handoff_reasons, w.category)}</b>
                </div>
              )}
              {w.rfi_subject && <div className="text-[12px] text-[#4f483d]">Form: <b>{w.rfi_subject}</b></div>}
              {w.shared_response && w.shared_response.length > 0 && (
                <div className="rounded-lg border border-[#cfe3d6] bg-[#eef5f0]">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#163f2d] border-b border-[#cfe3d6]">RFI response shared with you</div>
                  <dl className="px-3 py-2 space-y-1.5">
                    {w.shared_response.map((a, i) => (
                      <div key={i}>
                        <dt className="text-[11px] text-[#6f6654]">{a.label}</dt>
                        <dd className="text-[13px] text-[#1f2a22] whitespace-pre-wrap break-words">{a.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
              {editing ? (
                <div className="rounded-lg border border-[#cfe3d6] bg-[#eef5f0] p-3 space-y-2">
                  <label className="block"><FieldLabel label="Title" /><input value={tDraft} onChange={(e) => setTDraft(e.target.value)} maxLength={255} className={input} /></label>
                  <label className="block"><FieldLabel label="Details" /><textarea value={dDraft} onChange={(e) => setDDraft(e.target.value)} rows={4} className={textarea} /></label>
                  <div className="flex gap-2">
                    <button disabled={busy || !tDraft.trim()} onClick={async () => { await patch({ title: tDraft.trim(), description: dDraft }); setEditing(false); }} className={btn.brand}>Save changes</button>
                    <button onClick={() => setEditing(false)} className={btn.neutral}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="rounded bg-[#fbf8f2] border border-[#ebe2d0] p-3">
                  {w.description ? <div className="whitespace-pre-wrap">{w.description}</div> : <div className="text-[#6f6654]">No details yet.</div>}
                  {w.status !== "done" && w.status !== "cancelled" && (
                    <button onClick={() => { setTDraft(w.title); setDDraft(w.description || ""); setEditing(true); }} className="mt-2 text-[12px] text-[#1b5038] hover:underline">Edit title and details</button>
                  )}
                </div>
              )}
              <label className="block">
                <FieldLabel label="Resolution" help="Required to close a case. Say what was done so anyone reading later understands the outcome." />
                <textarea value={resolution} onChange={(e) => setResolution(e.target.value)} onBlur={() => resolution !== (w.resolution || "") && patch({ resolution })} rows={2} className={textarea} />
              </label>

              <div className="pt-2 border-t border-[#ebe2d0]">
                <FieldLabel label="Conversation & history" help="Comments between teams plus an automatic record of every change." />
                <div className="flex gap-2 mb-3">
                  <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder="Write a comment for the other team…" className={textarea} />
                  <button disabled={busy || !comment.trim()} onClick={addComment} className={`${btn.brand} self-end`}>Post</button>
                </div>
                <ol className="space-y-2">
                  {[...(w.comments || [])].reverse().map((c) => (
                    <li key={c.id} className={c.kind === "system" ? "text-[12px] text-[#6f6654]" : "rounded-lg border border-[#ebe2d0] p-2.5"}>
                      {c.kind === "system" ? (
                        <>• {c.text} — {c.author_email} · {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</>
                      ) : (
                        <>
                          <div className="text-[11px] text-[#6f6654] mb-0.5">{c.author_email} · {format(new Date(c.created_at), "MMM d, h:mm a")}</div>
                          <div className="whitespace-pre-wrap">{c.text}</div>
                        </>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="text-[11px] text-[#6f6654]">
                Created by {w.created_by_email || "—"} {w.created_at && formatDistanceToNow(new Date(w.created_at), { addSuffix: true })}
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

export function WorkRow({ meta, w, onOpen, showContact = true }: { meta: Meta; w: WorkItem; onOpen: () => void; showContact?: boolean }) {
  return (
    <tr className="border-b border-[#ebe2d0] hover:bg-[#eef5f0] cursor-pointer" onClick={onOpen}>
      <td className="px-3 py-2 text-[12px] text-[#6f6654] tabular-nums">#{w.number}</td>
      <td className="px-3 py-2">
        <div className="text-[13px] text-[#1b5038] font-medium">{w.title}</div>
        <div className="text-[11px] text-[#6f6654]">
          {labelOf(meta.work_kinds, w.kind)}
          {w.category ? ` · ${labelOf(w.kind === "case" ? meta.case_categories : meta.handoff_reasons, w.category)}` : ""}
        </div>
      </td>
      {showContact && <td className="px-3 py-2 text-[13px]">{w.contact_name || <span className="text-[#d3c6aa]">—</span>}</td>}
      <td className="px-3 py-2 text-[12px]">{labelOf(meta.work_statuses, w.status)}</td>
      <td className={`px-3 py-2 text-[12px] capitalize ${PRIORITY_STYLE[w.priority]}`}>{w.priority}</td>
      <td className={`px-3 py-2 text-[12px] whitespace-nowrap ${w.overdue ? "text-[#ba0517] font-semibold" : "text-[#4f483d]"}`}>
        {w.due_at ? format(new Date(w.due_at), "MMM d, h:mm a") : "—"}
        {w.overdue && " · overdue"}
      </td>
      <td className="px-3 py-2 text-[12px] text-[#4f483d] truncate max-w-[180px]">{w.owner_email || <span className="text-[#b3a78c]">Queue</span>}</td>
    </tr>
  );
}

export function WorkTableHead({ showContact = true }: { showContact?: boolean }) {
  return (
    <thead>
      <tr className="bg-[#fbf8f2] border-b border-[#e2d7c0] text-left text-[11px] uppercase tracking-wide text-[#4f483d]">
        <th className="px-3 py-2 font-semibold">#</th>
        <th className="px-3 py-2 font-semibold">Item</th>
        {showContact && <th className="px-3 py-2 font-semibold">Contact</th>}
        <th className="px-3 py-2 font-semibold">Status</th>
        <th className="px-3 py-2 font-semibold">Priority</th>
        <th className="px-3 py-2 font-semibold">Due</th>
        <th className="px-3 py-2 font-semibold">Owner</th>
      </tr>
    </thead>
  );
}

