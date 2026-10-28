"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { AlertTriangle, Copy, ExternalLink, Hand, Send, Undo2, X } from "lucide-react";
import {
  commentWork, Contact, createContact, createInvitation, createWork, CrmError, getWork, labelOf, Meta, PRIORITY_STYLE,
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
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  const needsPhone = !!(f.consent_call || f.consent_sms) && !String(f.phone || "").trim();

  const save = async (force = false) => {
    if (needsPhone) {
      setError("Enter a phone number, or untick OK to call / OK to text.");
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
      title="New Contact"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className={btn.neutral}>Cancel</button>
          <button onClick={() => save(false)} disabled={busy} className={btn.brand}>{busy ? "Saving…" : "Save"}</button>
        </>
      }
    >
      {dup ? (
        <div className="space-y-4">
          <div className="rounded border border-[#fe9339] bg-[#fef6ec] p-3 text-[13px]">
            <b>This person may already exist.</b> We found a contact with the same email, phone or R-number. Open the existing record to avoid duplicates.
          </div>
          <div className="rounded border border-[#dddbda] p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold text-[14px]">{dup.name}</div>
              <div className="text-[12px] text-[#747474] truncate">{[dup.phone, dup.email, dup.r_number].filter(Boolean).join(" · ")}</div>
            </div>
            <Link href={`/crm/contacts/${dup.id}`} className={btn.brand} onClick={onClose}>Open existing</Link>
          </div>
          <div className="flex justify-between items-center text-[13px]">
            <button onClick={() => setDup(null)} className="text-[#0176d3] hover:underline">Back to the form</button>
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
            {txt("email", "Email", "", "email", "name@example.com")}
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
          <OptSelect label="Contact type" opts={meta.contact_types} value={f.contact_type} onChange={(v) => set("contact_type", v)} />
          <fieldset className="rounded border border-[#e5e5e5] p-3">
            <legend className="px-1 text-[12px] text-[#444]">Consent (ask the caller)</legend>
            <div className="flex flex-wrap gap-4 text-[13px]">
              {[["consent_call", "OK to call"], ["consent_email", "OK to email"], ["consent_sms", "OK to text (SMS)"]].map(([k, l]) => (
                <label key={k} className="flex items-center gap-1.5">
                  <input type="checkbox" checked={!!f[k]} onChange={(e) => set(k, e.target.checked)} className="accent-[#0176d3]" /> {l}
                </label>
              ))}
            </div>
            {needsPhone && <div role="alert" className="mt-2 flex items-start gap-1.5 rounded border border-[#fe9339] bg-[#fef6ec] px-2.5 py-1.5 text-[12px] text-[#7a4a00]"><AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" /><span><b>Add a phone number.</b> You ticked a phone option (call or text), so this person needs a phone number we can reach them on.</span></div>}
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

export function WorkItemDialog({ meta, preset, onCreated, onClose }: { meta: Meta; preset: WorkPreset; onCreated: (w: WorkItem) => void; onClose: () => void }) {
  const [f, setF] = useState({
    kind: preset.kind || "task", team: preset.team || "call_center", category: preset.category || "", title: preset.title || "",
    description: preset.description || "", priority: "normal", due_at: "", owner_id: preset.kind === "handoff" ? "" : meta.me.id,
  });
  const [shareResponse, setShareResponse] = useState(!!preset.submission_id);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const cats = f.kind === "case" ? meta.case_categories : f.kind === "handoff" ? meta.handoff_reasons : null;

  const save = async () => {
    if (!f.title.trim()) return setError("Give it a short title");
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

  const titleFor = { task: "New Task", callback: "Schedule Callback", case: "New Case", handoff: "Send to another team" } as Record<string, string>;

  return (
    <Modal
      title={titleFor[f.kind] || "New item"}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className={btn.neutral}>Cancel</button>
          <button onClick={save} disabled={busy} className={btn.brand}>{busy ? "Saving…" : "Save"}</button>
        </>
      }
    >
      <div className="space-y-3">
        <ErrorBox text={error} />
        {preset.contact_name && (
          <div className="text-[13px] text-[#444]">Related to <b>{preset.contact_name}</b></div>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          <OptSelect label="Type" opts={meta.work_kinds} value={f.kind} onChange={(v) => { set("kind", v); set("category", ""); }} />
          <OptSelect
            label="Team"
            opts={meta.teams}
            value={f.team}
            onChange={(v) => set("team", v)}
            help="Which team's queue this belongs to. Leave Assigned to empty to put it in that team's queue."
          />
        </div>
        {cats && (
          <OptSelect label={f.kind === "case" ? "Case category" : "Reason"} opts={cats} value={f.category} onChange={(v) => set("category", v)} allowEmpty emptyLabel="Choose…" />
        )}
        <label className="block">
          <FieldLabel label="Title" required />
          <input value={f.title} onChange={(e) => set("title", e.target.value)} className={input} placeholder={f.kind === "callback" ? "Call back about AI course start date" : "Short summary"} />
        </label>
        <label className="block">
          <FieldLabel label="Details" help="Everything the next person needs to know so they do not have to call back and ask again." />
          <textarea value={f.description} onChange={(e) => set("description", e.target.value)} rows={4} className={textarea} />
        </label>
        {preset.submission_id && (
          <label className="flex items-start gap-2 rounded border border-[#dddbda] bg-[#f3f9ff] px-3 py-2 text-[13px] cursor-pointer">
            <input type="checkbox" checked={shareResponse} onChange={(e) => setShareResponse(e.target.checked)} className="mt-0.5 h-4 w-4" />
            <span>
              <b>Send the RFI response to the Call Center</b>
              <span className="block text-[12px] text-[#444]">The person&apos;s answers are attached to this item, so the agent can read them before calling. Untick to send only the request above.</span>
            </span>
          </label>
        )}
        <div className="grid sm:grid-cols-3 gap-3">
          <OptSelect label="Priority" opts={meta.priorities} value={f.priority} onChange={(v) => set("priority", v)} />
          <label className="block">
            <FieldLabel label="Due" help="Cases and handoffs get a due date automatically from the priority if you leave this empty." />
            <input type="datetime-local" value={f.due_at} onChange={(e) => set("due_at", e.target.value)} className={input} />
          </label>
          <label className="block">
            <FieldLabel label="Assigned to" help="Empty = goes to the team queue for anyone to pick up." />
            <select value={f.owner_id} onChange={(e) => set("owner_id", e.target.value)} className={input}>
              <option value="">Team queue (unassigned)</option>
              {meta.people.map((p) => <option key={p.id} value={p.id}>{p.email}{p.id === meta.me.id ? " (me)" : ""}</option>)}
            </select>
          </label>
        </div>
      </div>
    </Modal>
  );
}

// ───────────────────────── Send RFI (personal link) ─────────────────────────

export function SendRfiDialog({ contact, onSent, onClose }: { contact: Contact; onSent: () => void; onClose: () => void }) {
  const [rfis, setRfis] = useState<{ id: string; subject: string }[] | null>(null);
  const [rfiId, setRfiId] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      onSent();
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
        <p className="text-[#444]">
          Creates a <b>personal link</b> for this person. When they open it or submit it, their record updates automatically, even if they type a different email.
        </p>
        <ErrorBox text={error} />
        {!link ? (
          <>
            {rfis === null ? (
              <p className="text-[#747474]">Loading forms…</p>
            ) : rfis.length === 0 ? (
              <p className="text-[#747474]">No published forms are available to you yet. Ask the RFI team to publish one.</p>
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
            <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#0176d3] hover:underline">
              Preview the form <ExternalLink className="h-3 w-3" />
            </a>
            {contact.email && (
              <a
                href={`mailto:${encodeURIComponent(contact.email)}?subject=${encodeURIComponent("Information you requested from TTU Online")}&body=${encodeURIComponent(`Hello ${contact.first_name || ""},\n\nPlease fill out this short form so we can help you:\n${link}\n\nThank you,\nTTU Online`)}`}
                className="inline-flex items-center gap-1 ml-4 text-[#0176d3] hover:underline"
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
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
          <div className="p-6 text-[13px] text-[#747474]">{error || "Loading…"}</div>
        ) : (
          <>
            <div className="sticky top-0 bg-[#f3f3f3] border-b border-[#dddbda] px-5 py-3 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] uppercase tracking-wide text-[#747474]">
                  {labelOf(meta.work_kinds, w.kind)} #{w.number} · {labelOf(meta.teams, w.team)}
                </div>
                <h2 className="text-[16px] font-bold text-[#181818] break-words">{w.title}</h2>
                {w.contact_id && (
                  <Link href={`/crm/contacts/${w.contact_id}`} className="text-[13px] text-[#0176d3] hover:underline" onClick={onClose}>
                    {w.contact_name || "Open contact"}
                  </Link>
                )}
              </div>
              <button onClick={onClose} className="text-[#747474] hover:text-[#181818]" aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-4 text-[13px]">
              <ErrorBox text={error} />
              <div className="flex flex-wrap gap-2">
                {!w.owner_id && w.status !== "done" && (
                  <button disabled={busy} onClick={() => patch({ claim: true })} className={btn.brand}><Hand className="h-3.5 w-3.5" /> Pick up</button>
                )}
                {w.owner_id && w.status !== "done" && (
                  <button disabled={busy} onClick={() => patch({ unassign: true })} className={btn.neutral}><Undo2 className="h-3.5 w-3.5" /> Return to queue</button>
                )}
              </div>
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
                <OptSelect label="Team" opts={meta.teams} value={w.team} onChange={(v) => patch({ team: v })} />
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
                  <span className="text-[12px] text-[#444]">{w.kind === "case" ? "Category" : "Reason"}: </span>
                  <b>{labelOf(w.kind === "case" ? meta.case_categories : meta.handoff_reasons, w.category)}</b>
                </div>
              )}
              {w.rfi_subject && <div className="text-[12px] text-[#444]">Form: <b>{w.rfi_subject}</b></div>}
              {w.shared_response && w.shared_response.length > 0 && (
                <div className="rounded border border-[#c9dff5] bg-[#f3f9ff]">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#014486] border-b border-[#c9dff5]">RFI response shared with you</div>
                  <dl className="px-3 py-2 space-y-1.5">
                    {w.shared_response.map((a, i) => (
                      <div key={i}>
                        <dt className="text-[11px] text-[#747474]">{a.label}</dt>
                        <dd className="text-[13px] text-[#181818] whitespace-pre-wrap break-words">{a.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
              {w.description && <div className="rounded bg-[#fafaf9] border border-[#e5e5e5] p-3 whitespace-pre-wrap">{w.description}</div>}
              <label className="block">
                <FieldLabel label="Resolution" help="Required to close a case. Say what was done so anyone reading later understands the outcome." />
                <textarea value={resolution} onChange={(e) => setResolution(e.target.value)} onBlur={() => resolution !== (w.resolution || "") && patch({ resolution })} rows={2} className={textarea} />
              </label>
              {w.status !== "done" && (
                <button disabled={busy} onClick={() => patch({ status: "done", resolution })} className={btn.brand}>Mark done</button>
              )}

              <div className="pt-2 border-t border-[#e5e5e5]">
                <FieldLabel label="Conversation & history" help="Comments between teams plus an automatic record of every change." />
                <div className="flex gap-2 mb-3">
                  <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder="Write a comment for the other team…" className={textarea} />
                  <button disabled={busy || !comment.trim()} onClick={addComment} className={`${btn.brand} self-end`}>Post</button>
                </div>
                <ol className="space-y-2">
                  {[...(w.comments || [])].reverse().map((c) => (
                    <li key={c.id} className={c.kind === "system" ? "text-[12px] text-[#747474]" : "rounded border border-[#e5e5e5] p-2.5"}>
                      {c.kind === "system" ? (
                        <>• {c.text} — {c.author_email} · {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</>
                      ) : (
                        <>
                          <div className="text-[11px] text-[#747474] mb-0.5">{c.author_email} · {format(new Date(c.created_at), "MMM d, h:mm a")}</div>
                          <div className="whitespace-pre-wrap">{c.text}</div>
                        </>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="text-[11px] text-[#747474]">
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
    <tr className="border-b border-[#e5e5e5] hover:bg-[#f3f9ff] cursor-pointer" onClick={onOpen}>
      <td className="px-3 py-2 text-[12px] text-[#747474] tabular-nums">#{w.number}</td>
      <td className="px-3 py-2">
        <div className="text-[13px] text-[#0176d3] font-medium">{w.title}</div>
        <div className="text-[11px] text-[#747474]">
          {labelOf(meta.work_kinds, w.kind)}
          {w.category ? ` · ${labelOf(w.kind === "case" ? meta.case_categories : meta.handoff_reasons, w.category)}` : ""}
        </div>
      </td>
      {showContact && <td className="px-3 py-2 text-[13px]">{w.contact_name || <span className="text-[#c9c9c9]">—</span>}</td>}
      <td className="px-3 py-2 text-[12px]">{labelOf(meta.work_statuses, w.status)}</td>
      <td className={`px-3 py-2 text-[12px] capitalize ${PRIORITY_STYLE[w.priority]}`}>{w.priority}</td>
      <td className={`px-3 py-2 text-[12px] whitespace-nowrap ${w.overdue ? "text-[#ba0517] font-semibold" : "text-[#444]"}`}>
        {w.due_at ? format(new Date(w.due_at), "MMM d, h:mm a") : "—"}
        {w.overdue && " · overdue"}
      </td>
      <td className="px-3 py-2 text-[12px] text-[#444] truncate max-w-[180px]">{w.owner_email || <span className="text-[#b0adab]">Queue</span>}</td>
    </tr>
  );
}

export function WorkTableHead({ showContact = true }: { showContact?: boolean }) {
  return (
    <thead>
      <tr className="bg-[#fafaf9] border-b border-[#dddbda] text-left text-[11px] uppercase tracking-wide text-[#444]">
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

