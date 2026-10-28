"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck } from "lucide-react";
import { apiFetch } from "@/lib/auth";

interface Note {
  id: string;
  kind: string;
  title: string;
  body: string;
  link: string;
  created_at: string;
  read: boolean;
}

/** The bell: shows what was assigned to you, what landed in your team's queue, and updates on work you sent. */
export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Note[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/rfi-api/notifications/");
      if (!res.ok) return;
      const d = await res.json();
      setItems(d.items);
      setUnread(d.unread);
    } catch {
      // the bell is a convenience; stay quiet if the request fails
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const openItem = async (n: Note) => {
    setOpen(false);
    if (!n.read) {
      setItems((p) => p.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      apiFetch(`/rfi-api/notifications/${n.id}/read`, { method: "POST" }).catch(() => {});
    }
    if (n.link) router.push(n.link);
  };

  const readAll = async () => {
    setItems((p) => p.map((x) => ({ ...x, read: true })));
    setUnread(0);
    await apiFetch("/rfi-api/notifications/read-all", { method: "POST" }).catch(() => {});
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); if (!open) load(); }}
        className="relative h-9 w-9 rounded-lg text-slate-600 hover:bg-slate-100 flex items-center justify-center"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        title="Notifications"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold leading-4 text-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[360px] max-w-[92vw] rounded-lg border border-slate-200 bg-white shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50">
            <span className="text-sm font-semibold text-slate-900">Notifications</span>
            <button onClick={readAll} disabled={unread === 0} className="inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:text-slate-300 disabled:no-underline">
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">Nothing yet. You will see assignments and queue updates here.</div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openItem(n)}
                  className={`w-full text-left px-3 py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 flex gap-2 ${n.read ? "" : "bg-sky-50/60"}`}
                >
                  <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${n.read ? "bg-transparent" : "bg-sky-600"}`} />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[13px] text-slate-900 ${n.read ? "" : "font-semibold"}`}>{n.title}</span>
                    {n.body && <span className="block text-xs text-slate-500 truncate">{n.body}</span>}
                    <span className="block text-[11px] text-slate-400 mt-0.5">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
