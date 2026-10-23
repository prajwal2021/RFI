"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Ban, ChevronLeft, ChevronRight, Contact2, MessageSquareText, UserPlus } from "lucide-react";
import { Contact, labelOf, listContacts } from "@/lib/crm";
import { btn, Card, Empty, ErrorBox, input, JourneyBadge, useMeta } from "@/components/crm/ui";
import { NewContactDialog } from "@/components/crm/dialogs";

const PAGE = 50;

function guessFromQuery(q: string): Partial<Contact> {
  const t = q.trim();
  if (!t) return {};
  if (t.includes("@")) return { email: t };
  if (/^[Rr]\d{8}$/.test(t)) return { r_number: t.toUpperCase() };
  if (t.replace(/\D/g, "").length >= 7) return { phone: t };
  const [first, ...rest] = t.split(/\s+/);
  return { first_name: first, last_name: rest.join(" ") };
}

function ContactsInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const { meta, error: metaError } = useMeta();
  const [q, setQ] = useState(sp.get("q") || "");
  const [query, setQuery] = useState(sp.get("q") || "");
  const [journey, setJourney] = useState(sp.get("journey") || "");
  const [lifecycle, setLifecycle] = useState("");
  const [ctype, setCtype] = useState("");
  const [owner, setOwner] = useState("");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<{ total: number; rows: Contact[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(sp.get("new") === "1");

  useEffect(() => {
    setQ(sp.get("q") || "");
    setQuery(sp.get("q") || "");
    setJourney(sp.get("journey") || "");
    if (sp.get("new") === "1") setShowNew(true);
  }, [sp]);

  useEffect(() => {
    const t = setTimeout(() => setQuery(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => setOffset(0), [query, journey, lifecycle, ctype, owner]);

  useEffect(() => {
    setData(null);
    listContacts({ q: query, journey, lifecycle, contact_type: ctype, owner, limit: PAGE, offset })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [query, journey, lifecycle, ctype, owner, offset]);

  const sel = (value: string, set: (v: string) => void, opts: { value: string; label: string }[], all: string) => (
    <select value={value} onChange={(e) => set(e.target.value)} className={`${input} w-auto min-w-[150px]`}>
      <option value="">{all}</option>
      {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-[20px] font-bold">Contacts</h1>
          <p className="text-[13px] text-[#444]">Everyone who has called, been called or filled an RFI. Always search before creating someone new.</p>
        </div>
        <button onClick={() => setShowNew(true)} className={btn.brand}><UserPlus className="h-4 w-4" /> New Contact</button>
      </div>
      <ErrorBox text={error || metaError} />

      <Card title={journey && meta ? `List: ${labelOf(meta.journey, journey)}` : "All contacts"} icon={<Contact2 className="h-4 w-4" />} iconColor="#5867e8" bodyClass="p-0"
        help={journey && meta ? meta.journey.find((j) => j.value === journey)?.description : "Use the filters to build a call list, e.g. everyone who responded but was never contacted."}>
        <div className="flex flex-wrap gap-2 p-3 border-b border-[#e5e5e5] bg-[#fafaf9]">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, phone, email, R-number, organization…" className={`${input} flex-1 min-w-[220px]`} />
          {meta && sel(journey, setJourney, meta.journey, "Any journey status")}
          {meta && sel(lifecycle, setLifecycle, meta.lifecycle, "Any lifecycle")}
          {meta && sel(ctype, setCtype, meta.contact_types, "Any type")}
          {sel(owner, setOwner, [{ value: "me", label: "Owned by me" }, { value: "none", label: "No owner" }], "Any owner")}
        </div>
        {!data || !meta ? (
          <Empty text="Loading…" />
        ) : data.rows.length === 0 ? (
          <Empty text={query ? `Nobody matches "${query}".` : "No contacts match these filters."}>
            {query && <button onClick={() => setShowNew(true)} className={btn.brand}><UserPlus className="h-4 w-4" /> Create &ldquo;{query}&rdquo;</button>}
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-[#fafaf9] border-b border-[#dddbda] text-left text-[11px] uppercase tracking-wide text-[#444]">
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Phone</th>
                  <th className="px-3 py-2 font-semibold">Email</th>
                  <th className="px-3 py-2 font-semibold">Type / lifecycle</th>
                  <th className="px-3 py-2 font-semibold">Journey</th>
                  <th className="px-3 py-2 font-semibold">Owner</th>
                  <th className="px-3 py-2 font-semibold">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((c) => (
                  <tr key={c.id} className="border-b border-[#e5e5e5] hover:bg-[#f3f9ff] cursor-pointer" onClick={() => router.push(`/crm/contacts/${c.id}`)}>
                    <td className="px-3 py-2">
                      <Link href={`/crm/contacts/${c.id}`} className="text-[#0176d3] font-medium hover:underline" onClick={(e) => e.stopPropagation()}>{c.name}</Link>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#747474]">
                        {c.r_number && <span>{c.r_number}</span>}
                        {c.organization_name && <span className="truncate max-w-[160px]">{c.organization_name}</span>}
                        {c.do_not_contact && <span className="inline-flex items-center gap-0.5 text-[#ba0517] font-semibold"><Ban className="h-3 w-3" /> DNC</span>}
                        {c.consent_sms && !c.do_not_contact && <span className="inline-flex items-center gap-0.5 text-[#2e844a]" title="Agreed to text messages"><MessageSquareText className="h-3 w-3" /> SMS</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{c.phone || "—"}</td>
                    <td className="px-3 py-2 truncate max-w-[220px]">{c.email || "—"}</td>
                    <td className="px-3 py-2 text-[12px]">{labelOf(meta.contact_types, c.contact_type)}<div className="text-[#747474]">{labelOf(meta.lifecycle, c.lifecycle)}</div></td>
                    <td className="px-3 py-2"><JourneyBadge value={c.journey} label={c.journey_label} help={c.journey_help} /></td>
                    <td className="px-3 py-2 text-[12px] truncate max-w-[160px]">{c.owner_email || "—"}</td>
                    <td className="px-3 py-2 text-[12px] text-[#444] whitespace-nowrap">{c.last_activity_at ? formatDistanceToNow(new Date(c.last_activity_at), { addSuffix: true }) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.total > PAGE && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-[#e5e5e5] text-[12px] text-[#444]">
            <span>{offset + 1}–{Math.min(offset + PAGE, data.total)} of {data.total}</span>
            <div className="flex gap-1">
              <button disabled={offset === 0} onClick={() => setOffset(offset - PAGE)} className={btn.icon} aria-label="Previous"><ChevronLeft className="h-4 w-4" /></button>
              <button disabled={offset + PAGE >= data.total} onClick={() => setOffset(offset + PAGE)} className={btn.icon} aria-label="Next"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </Card>

      {showNew && meta && (
        <NewContactDialog
          meta={meta}
          initial={guessFromQuery(q)}
          onClose={() => setShowNew(false)}
          onCreated={(c) => router.push(`/crm/contacts/${c.id}`)}
        />
      )}
    </div>
  );
}

export default function ContactsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-[13px] text-[#747474]">Loading…</div>}>
      <ContactsInner />
    </Suspense>
  );
}
