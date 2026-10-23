"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlarmClock, CalendarCheck, Inbox, ListTodo, PhoneCall, UserRoundSearch, Users } from "lucide-react";
import { Contact, getHome, listWork, WorkItem } from "@/lib/crm";
import { Card, Empty, ErrorBox, HelpTip, JourneyBadge, useMeta } from "@/components/crm/ui";
import { WorkDrawer, WorkRow, WorkTableHead } from "@/components/crm/dialogs";

function Stat({ label, value, help, href, tone = "#0176d3", icon }: { label: string; value: number | string; help: string; href?: string; tone?: string; icon: React.ReactNode }) {
  const body = (
    <div className="rounded border border-[#dddbda] bg-white p-4 shadow-[0_2px_2px_0_rgba(0,0,0,0.06)] hover:border-[#0176d3] transition h-full">
      <div className="flex items-center justify-between text-[12px] text-[#444]">
        <span className="flex items-center gap-1">{label} <HelpTip text={help} /></span>
        <span style={{ color: tone }}>{icon}</span>
      </div>
      <div className="mt-1 text-[28px] font-light tabular-nums" style={{ color: tone }}>{value}</div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

const FOLLOW_UP_LISTS = [
  { value: "responded_not_contacted", hint: "Submitted an RFI; nobody has called yet. Call them first." },
  { value: "rfi_opened", hint: "Opened their personal RFI link but did not finish. Offer help." },
  { value: "rfi_sent", hint: "Got a personal link but never opened it. Send a reminder or call." },
  { value: "called_no_rfi", hint: "We spoke to them but never sent a form. Send one if useful." },
];

export default function CrmHome() {
  const router = useRouter();
  const { meta, error: metaError } = useMeta();
  const [home, setHome] = useState<{ stats: Record<string, any>; recent_contacts: Contact[] } | null>(null);
  const [mine, setMine] = useState<WorkItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(() => {
    getHome().then(setHome).catch((e) => setError(e.message));
    listWork({ view: "mine", status: "open" }).then(setMine).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const s = home?.stats || {};
  const jc: Record<string, number> = s.journey_counts || {};

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-[20px] font-bold">Home</h1>
          <p className="text-[13px] text-[#444]">Your calls, tasks and the people who need a follow-up today.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/crm/contacts?new=1" className="inline-flex items-center gap-1.5 h-8 px-3 rounded border border-[#0176d3] bg-[#0176d3] text-white text-[13px] font-medium hover:bg-[#014486]">
            <PhoneCall className="h-4 w-4" /> Take a call
          </Link>
        </div>
      </div>
      <ErrorBox text={error || metaError} />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Stat label="My open work" value={s.my_open ?? "—"} help="Tasks, callbacks, cases and handoffs assigned to you that are not done." href="/crm/work?view=mine" icon={<ListTodo className="h-5 w-5" />} />
        <Stat label="Overdue" value={s.my_overdue ?? "—"} help="Your items past their due date. Do these first." href="/crm/work?view=mine&status=overdue" tone="#ba0517" icon={<AlarmClock className="h-5 w-5" />} />
        <Stat label="Due today" value={s.my_due_today ?? "—"} help="Your items due before midnight." href="/crm/work?view=mine" tone="#dd7a01" icon={<CalendarCheck className="h-5 w-5" />} />
        <Stat label="My calls today" value={s.my_calls_today ?? "—"} help="Calls and voicemails you logged today." icon={<PhoneCall className="h-5 w-5" />} tone="#2e844a" />
        <Stat label="Call Center queue" value={s.queue_call_center ?? "—"} help="Unassigned items waiting for any agent to pick up." href="/crm/work?view=queue&team=call_center" icon={<Inbox className="h-5 w-5" />} tone="#5867e8" />
        <Stat label="RFI Team queue" value={s.queue_rfi ?? "—"} help="Items the Call Center sent to the RFI team that nobody has picked up yet." href="/crm/work?view=queue&team=rfi" icon={<Users className="h-5 w-5" />} tone="#9050e9" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card title="My Work" icon={<ListTodo className="h-4 w-4" />} className="lg:col-span-2" bodyClass="p-0"
          help="Everything assigned to you, overdue first. Click a row to work it."
          actions={<Link href="/crm/work?view=mine" className="text-[13px] text-[#0176d3] hover:underline">View all</Link>}>
          {!mine || !meta ? (
            <Empty text="Loading…" />
          ) : mine.length === 0 ? (
            <Empty text="Nothing assigned to you. Pick something up from a queue.">
              <Link href="/crm/work?view=queue&team=call_center" className="text-[13px] text-[#0176d3] hover:underline">Open the Call Center queue</Link>
            </Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <WorkTableHead />
                <tbody>{mine.slice(0, 12).map((w) => <WorkRow key={w.id} meta={meta} w={w} onOpen={() => setOpen(w.id)} />)}</tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="People to follow up" icon={<UserRoundSearch className="h-4 w-4" />} iconColor="#dd7a01"
          help="Saved lists built from each person's journey. Click one to see the people and work through them.">
          <ul className="space-y-2">
            {FOLLOW_UP_LISTS.map((l) => {
              const opt = meta?.journey.find((j) => j.value === l.value);
              return (
                <li key={l.value}>
                  <button onClick={() => router.push(`/crm/contacts?journey=${l.value}`)} className="w-full text-left rounded border border-[#e5e5e5] p-2.5 hover:border-[#0176d3] hover:bg-[#f3f9ff]">
                    <div className="flex items-center justify-between gap-2">
                      <JourneyBadge value={l.value} label={opt?.label} />
                      <span className="text-[18px] font-light tabular-nums">{jc[l.value] ?? 0}</span>
                    </div>
                    <div className="mt-1 text-[12px] text-[#444]">{l.hint}</div>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <Card title="Recently worked" icon={<Users className="h-4 w-4" />} iconColor="#06a59a" help="People you logged a call or note for most recently.">
        {!home ? (
          <Empty text="Loading…" />
        ) : home.recent_contacts.length === 0 ? (
          <Empty text="Log your first call from a contact record and it will show up here." />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {home.recent_contacts.map((c) => (
              <Link key={c.id} href={`/crm/contacts/${c.id}`} className="rounded border border-[#e5e5e5] p-2.5 hover:border-[#0176d3] hover:bg-[#f3f9ff]">
                <div className="text-[13px] font-semibold text-[#0176d3] truncate">{c.name}</div>
                <div className="text-[11px] text-[#747474] truncate">{[c.phone, c.email].filter(Boolean).join(" · ") || "—"}</div>
                <div className="mt-1"><JourneyBadge value={c.journey} label={c.journey_label} /></div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {open && meta && <WorkDrawer meta={meta} id={open} onClose={() => setOpen(null)} onChanged={load} />}
    </div>
  );
}
