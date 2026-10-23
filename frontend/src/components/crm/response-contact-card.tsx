"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Headset, PhoneForwarded } from "lucide-react";
import { getContactSummary, labelOf } from "@/lib/crm";
import { JourneyBadge, Toast, useMeta } from "@/components/crm/ui";
import { WorkItemDialog } from "@/components/crm/dialogs";

type Summary = Awaited<ReturnType<typeof getContactSummary>>;

/** Shown on an RFI response: who this person is in the Call Center, and a one-click handoff to call them. */
export default function ResponseContactCard({ submissionId, contactId, rfiId }: { submissionId: string; contactId: string | null; rfiId: string }) {
  const { meta } = useMeta();
  const [s, setS] = useState<Summary | null>(null);
  const [failed, setFailed] = useState(false);
  const [handoff, setHandoff] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setS(null);
    setFailed(false);
    if (contactId) getContactSummary(contactId).then(setS).catch(() => setFailed(true));
  }, [contactId]);

  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-sky-800 font-semibold">
        <Headset className="h-3.5 w-3.5" /> Call Center
      </div>
      {!contactId ? (
        <p className="text-xs text-slate-500">This response could not be matched to a person (no name, email or phone was given).</p>
      ) : failed ? (
        <p className="text-xs text-slate-500">This person is in a Call Center list you cannot see.</p>
      ) : !s ? (
        <p className="text-xs text-slate-400">Loading…</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <a href={`/rfi/crm/contacts/${contactId}`} className="text-sm font-semibold text-sky-800 hover:underline truncate">{s.contact.name}</a>
            <JourneyBadge value={s.contact.journey} label={s.contact.journey_label} help={s.contact.journey_help} />
          </div>
          <div className="text-xs text-slate-600">
            {s.calls} call{s.calls === 1 ? "" : "s"} · {s.open_work} open item{s.open_work === 1 ? "" : "s"}
            {s.last_interaction && meta && (
              <> · last {labelOf(meta.channels, s.last_interaction.channel).toLowerCase()} {formatDistanceToNow(new Date(s.last_interaction.at), { addSuffix: true })}
                {s.last_interaction.agent ? ` by ${s.last_interaction.agent}` : ""}</>
            )}
          </div>
          {s.contact.do_not_contact && <div className="text-xs font-semibold text-red-700">Do not contact</div>}
        </>
      )}
      <button
        onClick={() => setHandoff(true)}
        disabled={!meta || s?.contact.do_not_contact}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-sky-300 bg-white text-xs font-medium text-sky-800 hover:bg-sky-100 disabled:opacity-50"
        title="Ask the Call Center to phone this person about their response"
      >
        <PhoneForwarded className="h-3.5 w-3.5" /> Send to Call Center
      </button>
      {handoff && meta && (
        <WorkItemDialog
          meta={meta}
          preset={{
            kind: "handoff", team: "call_center", category: "call_request", submission_id: submissionId, rfi_id: rfiId,
            contact_id: contactId || undefined, contact_name: s?.contact.name, title: `Please call ${s?.contact.name || "this respondent"}`,
          }}
          onClose={() => setHandoff(false)}
          onCreated={(w) => {
            setHandoff(false);
            setToast(`Sent to the Call Center queue (#${w.number})`);
          }}
        />
      )}
      {toast && <Toast text={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
