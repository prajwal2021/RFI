"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Gauge, Hourglass, Users } from "lucide-react";
import { getTeam } from "@/lib/crm";
import { Card, Empty, ErrorBox, HelpTip, useMeta } from "@/components/crm/ui";
import { WorkDrawer, WorkRow, WorkTableHead } from "@/components/crm/dialogs";

type Team = Awaited<ReturnType<typeof getTeam>>;

export default function TeamBoard() {
  const { meta } = useMeta();
  const [data, setData] = useState<Team | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const load = useCallback(() => {
    getTeam().then(setData).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const max = Math.max(1, ...(data?.people.map((p) => p.open) || [1]));

  return (
    <div className="max-w-7xl mx-auto space-y-3">
      <div>
        <h1 className="text-[20px] font-bold">Team Board</h1>
        <p className="text-[13px] text-[#444]">Who is working on what, how deep each queue is, and what has stalled. For supervisors balancing the workload.</p>
      </div>
      <ErrorBox text={error} />
      <div className="grid sm:grid-cols-3 gap-3">
        {(data?.queues || []).map((q) => (
          <div key={q.team} className="rounded border border-[#dddbda] bg-white p-4 shadow-[0_2px_2px_0_rgba(0,0,0,0.06)]">
            <div className="text-[13px] font-semibold flex items-center gap-1">{q.label} queue
              <HelpTip text="Unassigned = waiting for someone to pick it up. Oldest shows how long the oldest one has waited." /></div>
            <div className="mt-1 flex items-end gap-4">
              <div><div className="text-[28px] font-light tabular-nums text-[#0176d3]">{q.unassigned}</div><div className="text-[11px] text-[#444]">unassigned</div></div>
              <div><div className="text-[20px] font-light tabular-nums">{q.open}</div><div className="text-[11px] text-[#444]">open total</div></div>
              <div><div className={`text-[20px] font-light tabular-nums ${q.overdue ? "text-[#ba0517]" : ""}`}>{q.overdue}</div><div className="text-[11px] text-[#444]">overdue</div></div>
            </div>
            <div className="mt-2 text-[11px] text-[#747474]">{q.oldest_unassigned_at ? `Oldest waiting ${formatDistanceToNow(new Date(q.oldest_unassigned_at))}` : "Queue is empty"}</div>
          </div>
        ))}
      </div>

      <Card title="People" icon={<Users className="h-4 w-4" />} iconColor="#5867e8" bodyClass="p-0"
        help="Open = not done. In progress = actively being worked. Closed this week and calls show throughput.">
        {!data ? <Empty text="Loading…" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead><tr className="bg-[#fafaf9] border-b border-[#dddbda] text-left text-[11px] uppercase tracking-wide text-[#444]">
                <th className="px-3 py-2">Person</th><th className="px-3 py-2 w-[30%]">Workload</th><th className="px-3 py-2">Open</th><th className="px-3 py-2">In progress</th>
                <th className="px-3 py-2">Overdue</th><th className="px-3 py-2">Closed (7d)</th><th className="px-3 py-2">Calls today</th><th className="px-3 py-2">Calls (7d)</th>
              </tr></thead>
              <tbody>
                {data.people.map((p) => (
                  <tr key={p.id} className="border-b border-[#e5e5e5]">
                    <td className="px-3 py-2 truncate max-w-[220px]">{p.email}</td>
                    <td className="px-3 py-2"><div className="h-2.5 rounded-full bg-[#f3f3f3] overflow-hidden"><div className="h-full rounded-full bg-[#0176d3]" style={{ width: `${(p.open / max) * 100}%` }} /></div></td>
                    <td className="px-3 py-2 tabular-nums">{p.open}</td>
                    <td className="px-3 py-2 tabular-nums">{p.in_progress}</td>
                    <td className={`px-3 py-2 tabular-nums ${p.overdue ? "text-[#ba0517] font-semibold" : ""}`}>{p.overdue}</td>
                    <td className="px-3 py-2 tabular-nums">{p.closed_week}</td>
                    <td className="px-3 py-2 tabular-nums">{p.calls_today}</td>
                    <td className="px-3 py-2 tabular-nums">{p.calls_week}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Stalled items" icon={<Hourglass className="h-4 w-4" />} iconColor="#dd7a01" bodyClass="p-0"
        help="Open items nobody has touched for 3+ days. Reassign or nudge the owner.">
        {!data || !meta ? <Empty text="Loading…" /> : data.stalled.length === 0 ? <Empty text="Nothing stalled." /> : (
          <div className="overflow-x-auto"><table className="w-full"><WorkTableHead /><tbody>
            {data.stalled.map((w) => <WorkRow key={w.id} meta={meta} w={w} onOpen={() => setOpen(w.id)} />)}
          </tbody></table></div>
        )}
      </Card>
      {open && meta && <WorkDrawer meta={meta} id={open} onClose={() => setOpen(null)} onChanged={load} />}
      <p className="text-[11px] text-[#747474] flex items-center gap-1"><Gauge className="h-3 w-3" /> Updates when you open the page.</p>
    </div>
  );
}
