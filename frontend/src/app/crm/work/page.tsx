"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Inbox, Plus } from "lucide-react";
import { listWork, WorkItem } from "@/lib/crm";
import { btn, Card, Empty, ErrorBox, input, useMeta } from "@/components/crm/ui";
import { WorkDrawer, WorkItemDialog, WorkRow, WorkTableHead } from "@/components/crm/dialogs";

const VIEWS = [
  { key: "mine", label: "My work", help: "Everything assigned to you." },
  { key: "queue:call_center", label: "Call Center queue", help: "Unassigned Call Center items. Pick one up to work it." },
  { key: "queue:rfi", label: "RFI Team queue", help: "Unassigned items for the RFI team, mostly handoffs from the Call Center." },
  { key: "queue:escalations", label: "Escalations", help: "Unassigned items needing a supervisor." },
  { key: "team:call_center", label: "All Call Center", help: "Every open Call Center item, assigned or not." },
  { key: "team:rfi", label: "All RFI Team", help: "Every open RFI Team item." },
  { key: "created", label: "Sent by me", help: "Items you created or handed off, so you can see what happened to them." },
  { key: "all", label: "Everything", help: "All items you can see." },
];

function WorkInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const { meta, error: metaError } = useMeta();
  const initial = sp.get("view") === "queue" ? `queue:${sp.get("team") || "call_center"}` : sp.get("view") || "mine";
  const [view, setView] = useState(initial);
  const [status, setStatus] = useState(sp.get("status") || "open");
  const [kind, setKind] = useState("");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<WorkItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(sp.get("item"));
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    const [v, team] = view.includes(":") ? view.split(":") : [view, ""];
    setRows(null);
    listWork({ view: v, team, status, kind, q }).then(setRows).catch((e) => setError(e.message));
  }, [view, status, kind, q]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const current = VIEWS.find((v) => v.key === view);

  return (
    <div className="max-w-7xl mx-auto space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-[20px] font-bold">Work Queues</h1>
          <p className="text-[13px] text-[#444]">Tasks, callbacks, cases and handoffs. Unassigned items wait in a team queue until someone picks them up.</p>
        </div>
        <button onClick={() => setCreating(true)} className={btn.brand}><Plus className="h-4 w-4" /> New item</button>
      </div>
      <ErrorBox text={error || metaError} />
      <div className="flex gap-1 overflow-x-auto border-b border-[#dddbda]">
        {VIEWS.map((v) => (
          <button key={v.key} onClick={() => { setView(v.key); router.replace(`/crm/work`); }} title={v.help}
            className={`px-3 py-2 text-[13px] whitespace-nowrap border-b-[3px] -mb-px ${view === v.key ? "border-[#0176d3] font-semibold" : "border-transparent text-[#444] hover:border-[#c9c9c9]"}`}>
            {v.label}
          </button>
        ))}
      </div>
      <Card title={current?.label || "Work"} icon={<Inbox className="h-4 w-4" />} iconColor="#06a59a" help={current?.help} bodyClass="p-0">
        <div className="flex flex-wrap gap-2 p-3 border-b border-[#e5e5e5] bg-[#fafaf9]">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title or #number…" className={`${input} flex-1 min-w-[200px]`} />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${input} w-auto`}>
            <option value="open">Open (not done)</option>
            <option value="overdue">Overdue</option>
            <option value="waiting">Waiting on person</option>
            <option value="closed">Closed</option>
            <option value="">Any status</option>
          </select>
          {meta && (
            <select value={kind} onChange={(e) => setKind(e.target.value)} className={`${input} w-auto`}>
              <option value="">All types</option>
              {meta.work_kinds.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          )}
        </div>
        {!rows || !meta ? <Empty text="Loading…" /> : rows.length === 0 ? <Empty text="Nothing here. Nice work." /> : (
          <div className="overflow-x-auto"><table className="w-full"><WorkTableHead /><tbody>
            {rows.map((w) => <WorkRow key={w.id} meta={meta} w={w} onOpen={() => setOpen(w.id)} />)}
          </tbody></table></div>
        )}
      </Card>
      {open && meta && <WorkDrawer meta={meta} id={open} onClose={() => setOpen(null)} onChanged={load} />}
      {creating && meta && (
        <WorkItemDialog meta={meta} preset={{ team: view.includes(":") ? view.split(":")[1] : "call_center" }} onClose={() => setCreating(false)}
          onCreated={(w) => { setCreating(false); load(); setOpen(w.id); }} />
      )}
    </div>
  );
}

export default function WorkPage() {
  return (
    <Suspense fallback={<div className="p-6 text-[13px] text-[#747474]">Loading…</div>}>
      <WorkInner />
    </Suspense>
  );
}
