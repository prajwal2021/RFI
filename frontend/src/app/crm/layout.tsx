"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ClipboardCheck, Grid3x3, Headset, PhoneIncoming, Search } from "lucide-react";
import ProfileMenu from "@/components/profile-menu";
import { Contact, listContacts } from "@/lib/crm";
import { JourneyBadge } from "@/components/crm/ui";
import { useAccess } from "@/lib/access";
import NotificationBell from "@/components/notification-bell";

const RFI_USER_HIDDEN = ["/crm/team", "/crm/courses", "/crm/settings"];

const TABS = [
  { href: "/crm", label: "Home" },
  { href: "/crm/contacts", label: "People" },
  { href: "/crm/work", label: "Work" },
  { href: "/crm/team", label: "Team Board" },
  { href: "/crm/courses", label: "Courses" },
  { href: "/crm/settings", label: "Setup" },
  { href: "/crm/help", label: "Help" },
];

function GlobalSearch({ rfiOnly }: { rfiOnly: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Contact[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setRows([]);
      return;
    }
    const t = setTimeout(() => listContacts({ q: q.trim(), limit: 8 }).then((r) => setRows(r.rows)).catch(() => setRows([])), 220);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const go = () => {
    setOpen(false);
    router.push(`/crm/contacts?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="relative w-full max-w-xl" ref={ref}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-forest-200" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => e.key === "Enter" && go()}
        placeholder="Search people by name, phone, email, R-number or organization…"
        className="w-full h-9 pl-9 pr-3 rounded-lg border border-white/10 bg-white/10 text-[13px] text-white placeholder:text-forest-200 transition focus:outline-none focus:bg-white focus:text-[#1f2a22] focus:placeholder:text-[#9a8f78] focus:border-[#7c1fff] focus:ring-2 focus:ring-[#7c1fff]/30"
        aria-label="Search contacts"
      />
      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 mt-1.5 z-50 rounded-xl border border-[#ebe2d0] bg-white shadow-lift overflow-hidden">
          {rows.length === 0 ? (
            <div className="px-3 py-3 text-[13px] text-[#6f6654]">
              No matches.{" "}
              {!rfiOnly && <button className="text-[#1b5038] hover:underline" onClick={() => { setOpen(false); router.push(`/crm/call?q=${encodeURIComponent(q.trim())}`); }}>
                Add them as a new person
              </button>}
            </div>
          ) : (
            rows.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setOpen(false);
                  setQ("");
                  router.push(`/crm/contacts/${c.id}`);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[#f5efe3] border-b border-[#f5efe3] last:border-0"
              >
                <span className="h-7 w-7 rounded-full bg-gradient-to-br from-[#8f3dff] to-[#6a12e6] text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {(c.name[0] || "?").toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-[#1f2a22] truncate">{c.name}</span>
                  <span className="block text-[11px] text-[#6f6654] truncate">
                    {[c.phone, c.email, c.r_number, c.organization_name].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <JourneyBadge value={c.journey} label={c.journey_label} />
              </button>
            ))
          )}
          <button onClick={go} className="w-full px-3 py-2 text-left text-[12px] text-[#1b5038] bg-[#fbf8f2] hover:bg-[#f5efe3] border-t border-[#ebe2d0]">
            Show all results for &ldquo;{q.trim()}&rdquo;
          </button>
        </div>
      )}
    </div>
  );
}

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const active = (href: string) => (href === "/crm" ? pathname === "/crm" : pathname.startsWith(href));
  const { rfiOnly } = useAccess();
  const tabs = rfiOnly ? TABS.filter((t) => !RFI_USER_HIDDEN.includes(t.href)) : TABS;

  useEffect(() => {
    if (rfiOnly && RFI_USER_HIDDEN.some((h) => pathname.startsWith(h))) router.replace("/crm");
  }, [rfiOnly, pathname, router]);

  return (
    <div className="min-h-screen bg-[#f5efe3] text-[#1f2a22]">
      <header className="sticky top-0 z-40 bg-forest-900 text-sand-100 shadow-md shadow-forest-950/20">
        <div className="h-14 px-3 sm:px-5 flex items-center gap-3">
          <Link href="/crm" className="flex items-center gap-2.5 shrink-0" aria-label="Call Center home">
            <span className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#8f3dff] to-[#6a12e6] flex items-center justify-center shadow-md shadow-black/20">
              <Headset className="text-white" style={{ width: 18, height: 18 }} />
            </span>
            <span className="hidden lg:inline text-[16px] font-bold tracking-tight text-white">Call <span className="font-medium text-forest-200">Center</span></span>
          </Link>
          <div className="flex-1 flex justify-center min-w-0">
            <GlobalSearch rfiOnly={rfiOnly} />
          </div>
          {!rfiOnly && <button onClick={() => router.push("/crm/call")} className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-[#7c1fff] text-[13px] font-semibold text-white shadow-md shadow-[#7c1fff]/30 transition hover:bg-[#6a12e6]" title="Someone is on the phone: find them and log the call">
            <PhoneIncoming className="h-4 w-4" /> Take a call
          </button>}
          <Link href="/" className="hidden md:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-medium text-sand-100 transition hover:bg-white/10 hover:text-white" title="Switch to RFI Forms">
            <Grid3x3 className="h-4 w-4" /> RFI Forms
          </Link>
          <NotificationBell />
          <ProfileMenu />
        </div>
        <nav className="h-11 px-3 sm:px-5 flex items-stretch gap-1 border-t border-white/10 overflow-x-auto">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`flex items-center px-3 text-[13px] font-semibold whitespace-nowrap border-b-[3px] transition-colors ${active(t.href) ? "border-[#a366ff] text-white" : "border-transparent text-forest-200 hover:text-white hover:border-white/30"}`}
            >
              {t.label}
            </Link>
          ))}
          <span className="flex-1" />
          <Link href="/" className="md:hidden flex items-center px-3 text-[13px] text-forest-200 gap-1">
            <ClipboardCheck className="h-4 w-4" /> RFI
          </Link>
        </nav>
      </header>
      <main className="p-3 sm:p-5">{children}</main>
    </div>
  );
}
