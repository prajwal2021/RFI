"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ClipboardCheck, Grid3x3, Headset, Phone, Search, UserPlus } from "lucide-react";
import ProfileMenu from "@/components/profile-menu";
import { Contact, listContacts } from "@/lib/crm";
import { JourneyBadge } from "@/components/crm/ui";
import { useAccess } from "@/lib/access";
import NotificationBell from "@/components/notification-bell";

const RFI_USER_HIDDEN = ["/crm/team", "/crm/courses", "/crm/settings"];

const TABS = [
  { href: "/crm", label: "Home" },
  { href: "/crm/contacts", label: "Contacts" },
  { href: "/crm/work", label: "Work Queues" },
  { href: "/crm/team", label: "Team Board" },
  { href: "/crm/courses", label: "Courses" },
  { href: "/crm/settings", label: "Setup" },
  { href: "/crm/help", label: "Help" },
];

function GlobalSearch() {
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
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#747474]" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => e.key === "Enter" && go()}
        placeholder="Search people by name, phone, email, R-number or organization…"
        className="w-full h-8 pl-9 pr-3 rounded border border-[#c9c9c9] bg-white text-[13px] focus:outline-none focus:border-[#0176d3] focus:ring-1 focus:ring-[#0176d3]"
        aria-label="Search contacts"
      />
      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 mt-1 z-50 rounded border border-[#dddbda] bg-white shadow-xl overflow-hidden">
          {rows.length === 0 ? (
            <div className="px-3 py-3 text-[13px] text-[#747474]">
              No matches.{" "}
              <button className="text-[#0176d3] hover:underline" onClick={() => { setOpen(false); router.push(`/crm/contacts?new=1&q=${encodeURIComponent(q.trim())}`); }}>
                Create a new contact
              </button>
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
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[#f3f3f3] border-b border-[#f3f3f3] last:border-0"
              >
                <span className="h-7 w-7 rounded bg-[#5867e8] text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {(c.name[0] || "?").toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-[#181818] truncate">{c.name}</span>
                  <span className="block text-[11px] text-[#747474] truncate">
                    {[c.phone, c.email, c.r_number, c.organization_name].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <JourneyBadge value={c.journey} label={c.journey_label} />
              </button>
            ))
          )}
          <button onClick={go} className="w-full px-3 py-2 text-left text-[12px] text-[#0176d3] bg-[#fafaf9] hover:bg-[#f3f3f3] border-t border-[#e5e5e5]">
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
    <div className="min-h-screen bg-[#f3f3f3] text-[#181818]">
      <header className="sticky top-0 z-40 bg-white shadow-[0_2px_3px_rgba(0,0,0,0.08)]">
        <div className="h-12 px-3 sm:px-4 flex items-center gap-3">
          <Link href="/crm" className="flex items-center gap-2 shrink-0" aria-label="Call Center home">
            <span className="h-8 w-8 rounded bg-[#0176d3] flex items-center justify-center">
              <Headset className="text-white" style={{ width: 18, height: 18 }} />
            </span>
          </Link>
          <div className="flex-1 flex justify-center min-w-0">
            <GlobalSearch />
          </div>
          {!rfiOnly && <button onClick={() => router.push("/crm/contacts?new=1")} className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded border border-[#c9c9c9] text-[13px] text-[#0176d3] hover:bg-[#f3f3f3]" title="New contact">
            <UserPlus className="h-4 w-4" /> New
          </button>}
          <Link href="/" className="hidden md:inline-flex items-center gap-1.5 h-8 px-3 rounded text-[13px] text-[#444] hover:bg-[#f3f3f3]" title="Switch to RFI Forms">
            <Grid3x3 className="h-4 w-4" /> RFI Forms
          </Link>
          <NotificationBell />
          <ProfileMenu />
        </div>
        <nav className="h-10 px-3 sm:px-4 flex items-stretch gap-1 border-t border-[#e5e5e5] overflow-x-auto">
          <span className="flex items-center gap-1.5 pr-4 mr-1 border-r border-[#e5e5e5] text-[15px] font-semibold text-[#181818] whitespace-nowrap">
            <Phone className="h-4 w-4 text-[#0176d3]" /> Call Center
          </span>
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`flex items-center px-3 text-[13px] whitespace-nowrap border-b-[3px] ${active(t.href) ? "border-[#0176d3] text-[#181818] font-semibold" : "border-transparent text-[#444] hover:border-[#c9c9c9]"}`}
            >
              {t.label}
            </Link>
          ))}
          <span className="flex-1" />
          <Link href="/" className="md:hidden flex items-center px-3 text-[13px] text-[#444] gap-1">
            <ClipboardCheck className="h-4 w-4" /> RFI
          </Link>
        </nav>
      </header>
      {rfiOnly && (
        <div className="px-3 sm:px-4 pt-3">
          <div className="rounded border border-[#c9dff5] bg-[#f3f9ff] px-3 py-2 text-[12px] text-[#014486]">
            <b>RFI user view.</b> You can read every person and every call the Call Center has taken, with the notes (open a person to see their timeline). You work from the RFI Team queue and your own hand-offs. Use <b>Send to Call Center</b> on a person to ask for a call.
          </div>
        </div>
      )}
      <main className="p-3 sm:p-4">{children}</main>
    </div>
  );
}
