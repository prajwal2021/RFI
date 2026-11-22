"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, PhoneIncoming, Search, UserPlus } from "lucide-react";
import { Contact, listContacts } from "@/lib/crm";
import { btn, ErrorBox, JourneyBadge, useMeta } from "@/components/crm/ui";
import { NewContactDialog } from "@/components/crm/dialogs";

function guess(q: string): Partial<Contact> {
  const t = q.trim();
  if (!t) return {};
  if (t.includes("@")) return { email: t };
  if (/^[Rr]\d{8}$/.test(t)) return { r_number: t.toUpperCase() };
  if (t.replace(/\D/g, "").length >= 7) return { phone: t };
  const [first, ...rest] = t.split(/\s+/);
  return { first_name: first, last_name: rest.join(" ") };
}

/**
 * Take a call: the one place an agent starts when the phone rings.
 * 1. Ask who is calling and search.  2. Open the match, or add them as new.  3. Log the call on their record.
 */
function TakeCallInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const { meta, error: metaError } = useMeta();
  const [q, setQ] = useState(sp.get("q") || "");
  const [rows, setRows] = useState<Contact[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => ref.current?.focus(), []);
  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) return setRows(null);
    const h = setTimeout(() => listContacts({ q: t, limit: 8 }).then((r) => setRows(r.rows)).catch((e) => setError(e.message)), 220);
    return () => clearTimeout(h);
  }, [q]);

  const open = (c: Contact) => router.push(`/crm/contacts/${c.id}?log=1`);

  return (
    <div className="max-w-3xl mx-auto space-y-5 pt-2">
      <div className="text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8f3dff] to-[#6a12e6] text-white shadow-lg shadow-[#7c1fff]/30">
          <PhoneIncoming className="h-6 w-6" />
        </span>
        <h1 className="mt-3 text-[24px] font-bold tracking-tight">Take a call</h1>
        <p className="text-[13px] text-[#4f483d]">Ask who&apos;s calling, find them, then log the conversation on their record.</p>
      </div>

      <ol className="grid grid-cols-3 gap-2 text-[12px]">
        {["Find the caller", "Open or add them", "Log the call"].map((s, i) => (
          <li key={s} className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${i === 0 ? "border-[#7c1fff] bg-white text-[#1f2a22] font-semibold" : "border-[#ebe2d0] bg-white/60 text-[#6f6654]"}`}>
            <span className={`h-5 w-5 rounded-full text-[11px] font-bold flex items-center justify-center ${i === 0 ? "bg-[#7c1fff] text-white" : "bg-[#ebe2d0] text-[#4f483d]"}`}>{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>

      <ErrorBox text={error || metaError} />

      <div className="rounded-2xl border border-[#ebe2d0] bg-white shadow-soft p-4 sm:p-5">
        <label className="block text-[13px] font-semibold mb-2" htmlFor="caller">Who&apos;s calling?</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9a8f78]" />
          <input
            id="caller"
            ref={ref}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && rows?.length === 1 && open(rows[0])}
            placeholder="Phone number, name, email or R-number"
            className="w-full h-12 pl-11 pr-3 rounded-xl border border-[#e2d7c0] bg-[#fbf8f2] text-[15px] focus:outline-none focus:bg-white focus:border-[#7c1fff] focus:ring-2 focus:ring-[#7c1fff]/20"
          />
        </div>
        <p className="mt-1.5 text-[11px] text-[#6f6654]">Tip: the phone number is the quickest match. Any format works.</p>

        {rows && (
          <div className="mt-4">
            {rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#d3c6aa] bg-[#fbf8f2] px-4 py-6 text-center">
                <p className="text-[14px] font-semibold">No one matches &ldquo;{q.trim()}&rdquo;</p>
                <p className="text-[12px] text-[#6f6654] mt-0.5">Try their phone or email too. If they&apos;re new, add them now.</p>
                <button onClick={() => setCreating(true)} disabled={!meta} className={`${btn.brand} mt-3 h-9 px-4`}><UserPlus className="h-4 w-4" /> Add a new caller</button>
              </div>
            ) : (
              <>
                <div className="text-[11px] uppercase tracking-wide font-semibold text-[#6f6654] mb-1.5">{rows.length === 1 ? "1 match" : `${rows.length} matches`}: pick the caller</div>
                <ul className="divide-y divide-[#f5efe3] rounded-xl border border-[#ebe2d0] overflow-hidden">
                  {rows.map((c) => (
                    <li key={c.id}>
                      <button onClick={() => open(c)} className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-[#f4edff] group">
                        <span className="h-9 w-9 rounded-full bg-gradient-to-br from-[#2f7a54] to-[#1b5038] text-white text-sm font-bold flex items-center justify-center shrink-0">
                          {(c.name[0] || "?").toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] font-semibold text-[#1f2a22] truncate">{c.name}{c.do_not_contact && <span className="ml-2 text-[11px] text-[#ba0517]">Do not contact</span>}</span>
                          <span className="block text-[12px] text-[#6f6654] truncate">{[c.phone, c.email, c.r_number, c.organization_name].filter(Boolean).join(" · ") || "No contact details"}</span>
                        </span>
                        <JourneyBadge value={c.journey} label={c.journey_label} help={c.journey_help} />
                        <ArrowRight className="h-4 w-4 text-[#9a8f78] group-hover:text-[#7c1fff]" />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 text-center">
                  <button onClick={() => setCreating(true)} disabled={!meta} className="text-[12px] font-medium text-[#1b5038] hover:underline">None of these? Add a new caller</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {creating && meta && (
        <NewContactDialog meta={meta} initial={guess(q)} onClose={() => setCreating(false)} onCreated={(c) => router.push(`/crm/contacts/${c.id}?log=1`)} />
      )}
    </div>
  );
}

export default function TakeCallPage() {
  return (
    <Suspense fallback={<div className="p-6 text-[13px] text-[#6f6654]">Loading…</div>}>
      <TakeCallInner />
    </Suspense>
  );
}
