"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlarmClock, ArrowRight, CalendarCheck, Inbox, ListTodo, PhoneCall, PhoneIncoming, Send, UserRoundSearch, Users } from "lucide-react";
import { Contact, getHome, listWork, WorkItem } from "@/lib/crm";
import { Card, Empty, ErrorBox, HelpTip, JourneyBadge, useMeta } from "@/components/crm/ui";
import { WorkDrawer, WorkRow, WorkTableHead } from "@/components/crm/dialogs";

function Stat({ label, value, help, href, tone = "#1b5038", icon }: { label: string; value: number | string; help: string; href?: string; tone?: string; icon: React.ReactNode }) {
  const body = (
    <div className="rounded-xl border border-[#ebe2d0] bg-white p-4 shadow-soft hover:border-[#a366ff] hover:shadow-lift transition h-full">
      <div className="flex items-center justify-between text-[12px] text-[#4f483d]">
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

// The whole loop both teams share, shown once on Home so everyone knows where they fit.
const LOOP = [
  { who: "cc", text: "Student calls or is called" },
  { who: "cc", text: "Agent logs the call" },
  { who: "both", text: "Send to RFI team if they need a form" },
  { who: "rfi", text: "RFI team sends a personal link" },
  { who: "rfi", text: "Student submits the form" },
  { who: "cc", text: "Call Center follows up" },
  { who: "both", text: "Enrolled" },
];

function LoopStrip({ rfiOnly }: { rfiOnly: boolean }) {
  const mine = rfiOnly ? "rfi" : "cc";
  return (
    <div className="rounded-xl border border-[#ebe2d0] bg-white/70 px-3 py-2.5 shadow-soft">
      <div className="flex flex-wrap items-center gap-1 text-[12px]">
        <span className="shrink-0 mr-1 text-[11px] font-bold uppercase tracking-wide text-[#6f6654]">How it works</span>
        {LOOP.map((s, i) => (
          <span key={s.text} className="flex items-center gap-1 shrink-0">
            <span className={`rounded-full px-2.5 py-1 whitespace-nowrap ${s.who === mine || s.who === "both" ? "bg-[#1b5038] text-white font-medium" : "bg-[#f5efe3] text-[#6f6654]"}`}>{s.text}</span>
            {i < LOOP.length - 1 && <ArrowRight className="h-3 w-3 text-[#b3a78c]" />}
          </span>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-[#6f6654]">Dark steps are yours. Every step is saved on the person&apos;s timeline, so both teams always see where they are.</p>
    </div>
  );
}

export default function CrmHome() {
  const router = useRouter();
  const { meta, error: metaError } = useMeta();
  const [home, setHome] = useState<{ stats: Record<string, any>; recent_contacts: Contact[] } | null>(null);
  const [mine, setMine] = useState<WorkItem[] | null>(null);
  const [queue, setQueue] = useState<WorkItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const rfiOnly = !!meta?.me.rfi_only;
  const myTeam = rfiOnly ? "rfi" : "call_center";

  const load = useCallback(() => {
    if (!meta) return;
    getHome().then(setHome).catch((e) => setError(e.message));
    listWork({ view: "mine", status: "open" }).then(setMine).catch((e) => setError(e.message));
    listWork({ view: "queue", team: myTeam, status: "open" }).then(setQueue).catch((e) => setError(e.message));
  }, [meta, myTeam]);
  useEffect(load, [load]);

  const s = home?.stats || {};
  const jc: Record<string, number> = s.journey_counts || {};
  const teamName = rfiOnly ? "RFI Team" : "Call Center";

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <section className="relative overflow-hidden rounded-2xl bg-forest-900 text-white px-5 py-5 sm:px-6 shadow-lift">
        <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-[#7c1fff]/30 blur-3xl" aria-hidden />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-forest-200">{teamName}</p>
            <h1 className="text-[22px] font-bold tracking-tight">
              {rfiOnly ? "Requests from the Call Center" : (s.my_overdue ? `You have ${s.my_overdue} overdue item${s.my_overdue === 1 ? "" : "s"}` : "Ready for the next call?")}
            </h1>
            <p className="text-[13px] text-forest-200 mt-0.5">
              {rfiOnly ? "Pick up a request, send the person a form, and the Call Center hears about it automatically."
                : "When the phone rings, press Take a call. Your callbacks and hand-offs are below."}
            </p>
          </div>
          {rfiOnly ? (
            <Link href="/crm/work?view=queue&team=rfi" className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#7c1fff] text-[14px] font-semibold shadow-lg shadow-[#7c1fff]/40 hover:bg-[#6a12e6]">
              <Send className="h-5 w-5" /> Open RFI Team queue
            </Link>
          ) : (
            <Link href="/crm/call" className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#7c1fff] text-[14px] font-semibold shadow-lg shadow-[#7c1fff]/40 hover:bg-[#6a12e6]">
              <PhoneIncoming className="h-5 w-5" /> Take a call
            </Link>
          )}
        </div>
      </section>

      <ErrorBox text={error || metaError} />
      {meta && <LoopStrip rfiOnly={rfiOnly} />}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Stat label="My open work" value={s.my_open ?? "—"} help="Tasks, callbacks, cases and hand-offs assigned to you that are not done." href="/crm/work?view=mine" icon={<ListTodo className="h-5 w-5" />} />
        <Stat label="Overdue" value={s.my_overdue ?? "—"} help="Your items past their due date. Do these first." href="/crm/work?view=mine&status=overdue" tone="#ba0517" icon={<AlarmClock className="h-5 w-5" />} />
        <Stat label="Due today" value={s.my_due_today ?? "—"} help="Your items due before midnight." href="/crm/work?view=mine" tone="#dd7a01" icon={<CalendarCheck className="h-5 w-5" />} />
        {rfiOnly
          ? <Stat label="People" value={home ? Object.values(jc).reduce((a, b) => a + b, 0) : "—"} help="Everyone the Call Center and your forms know about." href="/crm/contacts" icon={<Users className="h-5 w-5" />} tone="#2f7a54" />
          : <Stat label="My calls today" value={s.my_calls_today ?? "—"} help="Calls and voicemails you logged today." icon={<PhoneCall className="h-5 w-5" />} tone="#2f7a54" />}
        <Stat label="Call Center queue" value={s.queue_call_center ?? "—"} help="Unassigned items waiting for any agent to pick up." href="/crm/work?view=queue&team=call_center" icon={<Inbox className="h-5 w-5" />} tone="#7c1fff" />
        <Stat label="RFI Team queue" value={s.queue_rfi ?? "—"} help="Requests for the RFI team (usually 'send this person a form') that nobody has picked up yet." href="/crm/work?view=queue&team=rfi" icon={<Send className="h-5 w-5" />} tone="#9050e9" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card title={`Waiting in the ${teamName} queue`} icon={<Inbox className="h-4 w-4" />} iconColor="#7c1fff" bodyClass="p-0"
            help="Unassigned items for your team. Open one and pick it up so nobody else works it twice."
            actions={<Link href={`/crm/work?view=queue&team=${myTeam}`} className="text-[13px] text-[#1b5038] hover:underline">View all</Link>}>
            {!queue || !meta ? <Empty text="Loading…" /> : queue.length === 0 ? <Empty text="The queue is empty. Nice work." /> : (
              <div className="overflow-x-auto">
                <table className="w-full"><WorkTableHead /><tbody>{queue.slice(0, 8).map((w) => <WorkRow key={w.id} meta={meta} w={w} onOpen={() => setOpen(w.id)} />)}</tbody></table>
              </div>
            )}
          </Card>
          <Card title="My work" icon={<ListTodo className="h-4 w-4" />} bodyClass="p-0"
            help="Everything assigned to you, overdue first. Click a row to work it."
            actions={<Link href="/crm/work?view=mine" className="text-[13px] text-[#1b5038] hover:underline">View all</Link>}>
            {!mine || !meta ? <Empty text="Loading…" /> : mine.length === 0 ? <Empty text="Nothing assigned to you. Pick something up from the queue above." /> : (
              <div className="overflow-x-auto">
                <table className="w-full"><WorkTableHead /><tbody>{mine.slice(0, 12).map((w) => <WorkRow key={w.id} meta={meta} w={w} onOpen={() => setOpen(w.id)} />)}</tbody></table>
              </div>
            )}
          </Card>
        </div>

        <Card title="People to follow up" icon={<UserRoundSearch className="h-4 w-4" />} iconColor="#dd7a01"
          help="Ready-made call lists built from each person's journey. Click one to see the people and work through them.">
          <ul className="space-y-2">
            {FOLLOW_UP_LISTS.map((l) => {
              const opt = meta?.journey.find((j) => j.value === l.value);
              return (
                <li key={l.value}>
                  <button onClick={() => router.push(`/crm/contacts?journey=${l.value}`)} className="w-full text-left rounded-lg border border-[#ebe2d0] p-2.5 hover:border-[#1b5038] hover:bg-[#eef5f0]">
                    <div className="flex items-center justify-between gap-2">
                      <JourneyBadge value={l.value} label={opt?.label} />
                      <span className="text-[18px] font-light tabular-nums">{jc[l.value] ?? 0}</span>
                    </div>
                    <div className="mt-1 text-[12px] text-[#4f483d]">{l.hint}</div>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <Card title="Recently worked" icon={<Users className="h-4 w-4" />} iconColor="#7c1fff" help="People you logged a call or note for most recently.">
        {!home ? (
          <Empty text="Loading…" />
        ) : home.recent_contacts.length === 0 ? (
          <Empty text={rfiOnly ? "People you work with will show up here." : "Log your first call and the person will show up here."} />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {home.recent_contacts.map((c) => (
              <Link key={c.id} href={`/crm/contacts/${c.id}`} className="rounded-lg border border-[#ebe2d0] p-2.5 hover:border-[#1b5038] hover:bg-[#eef5f0]">
                <div className="text-[13px] font-semibold text-[#1b5038] truncate">{c.name}</div>
                <div className="text-[11px] text-[#6f6654] truncate">{[c.phone, c.email].filter(Boolean).join(" · ") || "—"}</div>
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
