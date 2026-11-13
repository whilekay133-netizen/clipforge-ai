"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CreditCard, Film, FolderKanban, Gauge, LayoutTemplate, Menu, Palette, Plus, Settings, Shield, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Overview", icon: Gauge, exact: true },
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
  { href: "/dashboard/videos", label: "Videos", icon: Film },
  { href: "/dashboard/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/dashboard/brand-assets", label: "Brand assets", icon: Palette },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function NavLinks({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate?: () => void }) {
  const path = usePathname();
  const active = (href: string, exact?: boolean) => (exact ? path === href : path === href || path.startsWith(href + "/"));
  return (
    <nav className="flex flex-col gap-1">
      <Link href="/dashboard/create" onClick={onNavigate} className={cn("mb-4 flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgb(139_92_246/0.8)] transition-colors hover:bg-brand-strong", active("/dashboard/create") && "ring-2 ring-brand-soft/60")}>
        <Plus className="h-4 w-4" /> Create video
      </Link>
      {items.map((i) => (
        <Link key={i.href} href={i.href} onClick={onNavigate}
          className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors", active(i.href, i.exact) ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface-2/60 hover:text-fg")}>
          <i.icon className="h-4 w-4" /> {i.label}
        </Link>
      ))}
      {isAdmin && (
        <Link href="/admin" onClick={onNavigate} className="mt-4 flex items-center gap-3 rounded-lg border border-warning/30 px-3 py-2 text-sm text-warning hover:bg-warning/10">
          <Shield className="h-4 w-4" /> Admin
        </Link>
      )}
    </nav>
  );
}

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface/60 px-4 py-5 lg:flex">
      <Logo href="/dashboard" className="mb-8 px-2" />
      <NavLinks isAdmin={isAdmin} />
    </aside>
  );
}

export function MobileNav({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button aria-label="Open menu" onClick={() => setOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-surface-2"><Menu className="h-5 w-5" /></button>
      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative h-full w-72 overflow-y-auto border-r border-border bg-surface px-4 py-5">
            <div className="mb-8 flex items-center justify-between px-2"><Logo href="/dashboard" /><button aria-label="Close menu" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button></div>
            <NavLinks isAdmin={isAdmin} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
