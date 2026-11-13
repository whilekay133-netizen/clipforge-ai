"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";

interface Notification { id: string; title: string; message: string; type: string; link: string | null; is_read: boolean; created_at: string }

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications", { cache: "no-store" });
    if (!res.ok) return;
    const body = await res.json();
    setItems(body.items);
    setUnread(body.unread);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => { clearInterval(t); document.removeEventListener("mousedown", close); };
  }, [load]);

  async function markAll() {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
    load();
  }

  return (
    <div className="relative" ref={ref}>
      <button aria-label="Notifications" onClick={() => setOpen(!open)} className="relative grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg">
        <Bell className="h-4.5 w-4.5" />
        {unread > 0 && <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3 text-sm">
            <span className="font-semibold">Notifications</span>
            {unread > 0 && <button onClick={markAll} className="text-xs text-brand-soft hover:underline">Mark all read</button>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted">You&apos;re all caught up.</p>}
            {items.map((n) => {
              const body = (
                <div className={cn("border-b border-border/60 px-4 py-3 text-sm last:border-0", !n.is_read && "bg-brand/5")}>
                  <div className="flex items-center gap-2 font-medium">{!n.is_read && <span className="h-1.5 w-1.5 rounded-full bg-brand" />}{n.title}</div>
                  <p className="mt-0.5 text-muted">{n.message}</p>
                  <p className="mt-1 text-[11px] text-muted/70">{formatDateTime(n.created_at)}</p>
                </div>
              );
              return n.link ? <Link key={n.id} href={n.link} onClick={() => setOpen(false)} className="block hover:bg-surface-2">{body}</Link> : <div key={n.id}>{body}</div>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
