"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowDownLeft, ArrowUpRight, PhoneCall, Search } from "lucide-react";
import { Call, labelOf, listCalls } from "@/lib/crm";
import { Card, Empty, ErrorBox, input, useMeta } from "@/components/crm/ui";

const RANGES = [
  { v: 1, l: "Today" },
  { v: 7, l: "Last 7 days" },
  { v: 30, l: "Last 30 days" },
  { v: 90, l: "Last 90 days" },
  { v: 365, l: "Last year" },
];

export default function CallLogPage() {
  const { meta } = useMeta();
  const [q, setQ] = useState("");
  const [days, setDays] = useState(30);
  const [agent, setAgent] = useState("");
  const [outcome, setOutcome] = useState("");
  const [rows, setRows] = useState<Call[] | null>(null);
  const [agents, setAgents] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    listCalls({ q: q.trim(), days, agent, outcome })
      .then((d) => {
        setRows(d.rows);
        setAgents((prev) => Array.from(new Set([...prev, ...d.agents])).sort());
        setError(null);
      })
      .catch((e) => setError(e.message));
  }, [q, days, agent, outcome]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="max-w-6xl mx-auto space-y-3">
      <div>
        <h1 className="text-[20px] font-bold">Call Log</h1>
        <p className="text-[13px] text-[#444]">
          Every call and voicemail the Call Center has taken or made, with the agent&apos;s notes. Open to the RFI team too, so you can see what people were told without asking.
        </p>
      </div>
      <ErrorBox text={error} />
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#747474]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by person, phone, or words in the notes…" className={`${input} pl-9 h-9`} />
        </div>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={`${input} h-9 w-auto`} aria-label="Time range">
          {RANGES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
        </select>
        <select value={agent} onChange={(e) => setAgent(e.target.value)} className={`${input} h-9 w-auto`} aria-label="Agent">
          <option value="">All agents</option>
          <option value="me">Only mine</option>
          {agents.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className={`${input} h-9 w-auto`} aria-label="Outcome">
          <option value="">Any outcome</option>
          {meta?.outcomes.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <Card title={rows ? `${rows.length} call${rows.length === 1 ? "" : "s"}` : "Calls"} icon={<PhoneCall className="h-4 w-4" />} iconColor="#2e844a" bodyClass="p-0"
        help="Newest first. Click a person to open their full record and timeline.">
        {!rows ? (
          <div className="p-6 text-[13px] text-[#747474]">Loading…</div>
        ) : rows.length === 0 ? (
          <Empty text="No calls match. Try a longer time range or clear the filters." />
        ) : (
          <ul className="divide-y divide-[#f3f3f3]">
            {rows.map((c) => (
              <li key={c.id} className="px-4 py-3 text-[13px]">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-[#747474] tabular-nums w-[130px] shrink-0">{format(new Date(c.at), "MMM d, yyyy h:mm a")}</span>
                  <Link href={`/crm/contacts/${c.contact.id}`} className="font-semibold text-[#0176d3] hover:underline">{c.contact.name}</Link>
                  {c.contact.phone && <span className="text-[#747474]">{c.contact.phone}</span>}
                  <span className="inline-flex items-center gap-1 text-[12px] text-[#444]" title={c.direction === "inbound" ? "Inbound" : "Outbound"}>
                    {c.direction === "inbound" ? <ArrowDownLeft className="h-3.5 w-3.5 text-[#2e844a]" /> : <ArrowUpRight className="h-3.5 w-3.5 text-[#0176d3]" />}
                    {labelOf(meta?.channels, c.channel)}
                  </span>
                  {c.outcome && <span className="rounded-full bg-[#f3f3f3] px-2 py-0.5 text-[11px] font-semibold text-[#181818]">{labelOf(meta?.outcomes, c.outcome)}</span>}
                  {c.course && <span className="text-[12px] text-[#444]">· {c.course}</span>}
                  {c.duration_minutes != null && <span className="text-[12px] text-[#747474]">· {c.duration_minutes} min</span>}
                  <span className="ml-auto text-[12px] text-[#747474]">{c.agent || "—"}</span>
                </div>
                {(c.subject || c.notes) && (
                  <div className="mt-1.5 pl-[142px] text-[#181818]">
                    {c.subject && <div className="font-medium">{c.subject}</div>}
                    {c.notes && <div className="whitespace-pre-wrap text-[#444]">{c.notes}</div>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
