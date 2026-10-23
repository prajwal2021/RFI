"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PhoneIncoming, UserPlus } from "lucide-react";
import { Contact, listContacts } from "@/lib/crm";
import { btn, Card, ErrorBox, JourneyBadge, useMeta } from "@/components/crm/ui";
import { NewContactDialog } from "@/components/crm/dialogs";

/**
 * Screen pop for CXone (or any phone system): open
 *   https://<host>/rfi/crm/pop?phone={ANI}&name={caller name}&ref={contact id}
 * when a call arrives. One match opens the record; several are listed; none offers a pre-filled New Contact.
 */
function PopInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const { meta } = useMeta();
  const phone = sp.get("phone") || sp.get("ani") || "";
  const email = sp.get("email") || "";
  const name = sp.get("name") || "";
  const [rows, setRows] = useState<Contact[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const q = phone || email || name;
    if (!q) return setRows([]);
    listContacts({ q, limit: 10 })
      .then((r) => {
        if (r.rows.length === 1) router.replace(`/crm/contacts/${r.rows[0].id}?pop=1`);
        else setRows(r.rows);
      })
      .catch((e) => setError(e.message));
  }, [phone, email, name, router]);

  const [first, ...rest] = name.trim().split(/\s+/);
  return (
    <div className="max-w-2xl mx-auto space-y-3">
      <ErrorBox text={error} />
      <Card title={`Incoming call${phone ? `: ${phone}` : ""}`} icon={<PhoneIncoming className="h-4 w-4" />} iconColor="#2e844a"
        help="Opened automatically by the phone system. If exactly one person matches, their record opens straight away.">
        {rows === null ? <p className="text-[13px] text-[#747474]">Looking up the caller…</p> : rows.length === 0 ? (
          <div className="text-[13px] space-y-3">
            <p>No one in the system has this number{name ? ` or name` : ""}. Create them now, then log the call.</p>
            <button onClick={() => setCreating(true)} className={btn.brand}><UserPlus className="h-4 w-4" /> New contact for this caller</button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[13px] text-[#444]">{rows.length} people match. Confirm who is calling (e.g. ask date of birth or R-number).</p>
            {rows.map((c) => (
              <Link key={c.id} href={`/crm/contacts/${c.id}`} className="flex items-center justify-between gap-2 rounded border border-[#e5e5e5] p-2.5 hover:border-[#0176d3] hover:bg-[#f3f9ff]">
                <span className="min-w-0"><b className="text-[13px] text-[#0176d3]">{c.name}</b>
                  <span className="block text-[11px] text-[#747474] truncate">{[c.phone, c.email, c.r_number, c.date_of_birth].filter(Boolean).join(" · ")}</span></span>
                <JourneyBadge value={c.journey} label={c.journey_label} />
              </Link>
            ))}
            <button onClick={() => setCreating(true)} className={btn.neutral}><UserPlus className="h-4 w-4" /> None of these — new contact</button>
          </div>
        )}
      </Card>
      {creating && meta && (
        <NewContactDialog meta={meta} initial={{ phone, email: email || null, first_name: first || "", last_name: rest.join(" ") }}
          onClose={() => setCreating(false)} onCreated={(c) => router.push(`/crm/contacts/${c.id}`)} />
      )}
    </div>
  );
}

export default function PopPage() {
  return (
    <Suspense fallback={<div className="p-6 text-[13px] text-[#747474]">Looking up the caller…</div>}>
      <PopInner />
    </Suspense>
  );
}
