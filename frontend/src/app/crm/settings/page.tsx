"use client";

import { useState } from "react";
import { ListChecks, Pencil, Plus, Search, Settings, Trash2 } from "lucide-react";
import { makeMatcher } from "@/lib/search";
import { createField, CustomField, deleteField, labelOf, Opt, updateField } from "@/lib/crm";
import { btn, Card, Empty, ErrorBox, FieldLabel, input, Modal, OptSelect, Toast, useMeta } from "@/components/crm/ui";

const LISTS: { key: string; title: string; help: string }[] = [
  { key: "outcomes", title: "Call outcomes", help: "Picked when logging a call. Drive reports and journey status." },
  { key: "reasons", title: "Contact reasons", help: "Why the person got in touch." },
  { key: "channels", title: "Channels", help: "How the conversation happened." },
  { key: "contact_types", title: "Contact types", help: "Who the person is." },
  { key: "lifecycle", title: "Lifecycle stages", help: "Where the person is overall." },
  { key: "interest_stages", title: "Course interest stages", help: "The path from inquiry to enrolled." },
  { key: "lost_reasons", title: "Lost reasons", help: "Required when an interest is marked Lost." },
  { key: "work_kinds", title: "Work item types", help: "Task, callback, case, handoff." },
  { key: "case_categories", title: "Case categories", help: "What a case is about." },
  { key: "handoff_reasons", title: "Handoff reasons", help: "Why work is passed between teams." },
  { key: "teams", title: "Teams & queues", help: "Each team has a queue for unassigned work." },
  { key: "work_statuses", title: "Work statuses", help: "Open → In progress → Waiting → Done." },
  { key: "priorities", title: "Priorities", help: "Also set the default due date for cases and handoffs." },
  { key: "journey", title: "Journey statuses", help: "Calculated automatically for every person." },
];

export default function SetupPage() {
  const { meta, reload } = useMeta();
  const [edit, setEdit] = useState<Partial<CustomField> & { optionsText?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const save = async () => {
    if (!edit?.label?.trim()) return setError("Give the field a label");
    setError(null);
    const payload = { label: edit.label, field_type: edit.field_type || "text", help_text: edit.help_text || "", position: Number(edit.position || 0),
      options: (edit.optionsText || "").split("\n").map((s) => s.trim()).filter(Boolean) };
    try {
      if (edit.id) await updateField(edit.id, payload);
      else await createField(payload);
      setEdit(null);
      setToast("Saved");
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    }
  };

  if (!meta) return <div className="p-6 text-[13px] text-[#747474]">Loading…</div>;

  const ql = q.trim();
  const match = makeMatcher(ql);
  const fields = meta.custom_fields.filter((f) => match(`${f.label} ${f.key} ${f.help_text} ${f.options.join(" ")} custom field`));
  // A list whose title/help matches shows in full; otherwise only the values that match
  const lists = LISTS.map((l) => {
    const opts = (meta as any)[l.key] as Opt[];
    const whole = match(`${l.title} ${l.help}`);
    return { ...l, opts: whole ? opts : opts.filter((o) => match(`${l.title} ${o.label} ${o.description}`)) };
  }).filter((l) => l.opts.length > 0);
  const nothing = !!ql && fields.length === 0 && lists.length === 0;

  return (
    <div className="max-w-6xl mx-auto space-y-3">
      <div>
        <h1 className="text-[20px] font-bold">Setup</h1>
        <p className="text-[13px] text-[#444]">Add your own fields to contacts and review the standard lists the app uses.</p>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#747474]" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search setup… e.g. classify, outcome, priority, case category" className={`${input} pl-9 h-9`} />
      </div>
      {nothing && (
        <div className="rounded border border-[#e5e5e5] bg-white p-6 text-center text-[13px] text-[#747474]">Nothing matches &ldquo;{ql}&rdquo;. Try a shorter word.</div>
      )}
      <ErrorBox text={error} />
      {(!ql || fields.length > 0) && <Card title="Custom contact fields" icon={<Settings className="h-4 w-4" />} iconColor="#747474"
        help="Extra fields shown on every contact (Edit → Additional fields), e.g. Employer ID or Expected graduation. Anyone can add; only admins can delete."
        actions={<button onClick={() => setEdit({ field_type: "text", optionsText: "" })} className={btn.brand}><Plus className="h-4 w-4" /> New field</button>} bodyClass="p-0">
        {fields.length === 0 ? <Empty text="No custom fields yet." /> : (
          <table className="w-full text-[13px]">
            <thead><tr className="bg-[#fafaf9] border-b border-[#dddbda] text-left text-[11px] uppercase tracking-wide text-[#444]">
              <th className="px-3 py-2">Label</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Help text</th><th className="px-3 py-2" /></tr></thead>
            <tbody>
              {fields.map((f) => (
                <tr key={f.id} className="border-b border-[#e5e5e5]">
                  <td className="px-3 py-2 font-medium">{f.label}<div className="text-[11px] text-[#747474] font-mono">{f.key}</div></td>
                  <td className="px-3 py-2">{labelOf(meta.custom_field_types, f.field_type)}{f.options.length > 0 && <div className="text-[11px] text-[#747474]">{f.options.join(", ")}</div>}</td>
                  <td className="px-3 py-2 text-[#444]">{f.help_text || "—"}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button onClick={() => setEdit({ ...f, optionsText: f.options.join("\n") })} className={btn.icon}><Pencil className="h-3.5 w-3.5" /></button>
                    {meta.me.is_admin && (
                      <button onClick={async () => { if (confirm(`Delete field "${f.label}"? Values already saved on contacts are kept but hidden.`)) { await deleteField(f.id).catch((e) => setError(e.message)); reload(); } }} className={`${btn.icon} ml-1`}>
                        <Trash2 className="h-3.5 w-3.5 text-[#ba0517]" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>}

      {lists.length > 0 && <Card title="Standard lists" icon={<ListChecks className="h-4 w-4" />} help="Built-in values with the descriptions agents see as help text. Ask an admin if you need a value added.">
        <div className="grid md:grid-cols-2 gap-4">
          {lists.map((l) => (
            <div key={l.key}>
              <h3 className="text-[13px] font-bold">{l.title}</h3>
              <p className="text-[12px] text-[#747474] mb-1">{l.help}</p>
              <ul className="rounded border border-[#e5e5e5] divide-y divide-[#f3f3f3]">
                {l.opts.map((o) => (
                  <li key={o.value} className="px-2.5 py-1.5 text-[12px]"><b>{o.label}</b> — <span className="text-[#444]">{o.description}</span></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>}

      {edit && (
        <Modal title={edit.id ? `Edit ${edit.label}` : "New custom field"} onClose={() => setEdit(null)}
          footer={<><button onClick={() => setEdit(null)} className={btn.neutral}>Cancel</button><button onClick={save} className={btn.brand}>Save</button></>}>
          <div className="space-y-3">
            <label className="block"><FieldLabel label="Label" required /><input value={edit.label || ""} onChange={(e) => setEdit({ ...edit, label: e.target.value })} className={input} /></label>
            <OptSelect label="Type" opts={meta.custom_field_types} value={edit.field_type || "text"} onChange={(v) => setEdit({ ...edit, field_type: v })} />
            {edit.field_type === "select" && (
              <label className="block"><FieldLabel label="Options (one per line)" />
                <textarea rows={4} value={edit.optionsText || ""} onChange={(e) => setEdit({ ...edit, optionsText: e.target.value })} className={input + " h-auto py-1.5"} /></label>
            )}
            <label className="block"><FieldLabel label="Help text" help="Shown as the (i) tip next to the field." /><input value={edit.help_text || ""} onChange={(e) => setEdit({ ...edit, help_text: e.target.value })} className={input} /></label>
            <label className="block"><FieldLabel label="Order" help="Lower numbers show first." /><input type="number" value={edit.position ?? 0} onChange={(e) => setEdit({ ...edit, position: Number(e.target.value) })} className={input} /></label>
          </div>
        </Modal>
      )}
      {toast && <Toast text={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
