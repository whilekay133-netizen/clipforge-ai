import Link from "next/link";
import { Coins } from "lucide-react";
import { getSessionProfile } from "@/lib/auth";
import { MobileNav, Sidebar } from "@/components/dashboard/sidebar-nav";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { Alert } from "@/components/ui/misc";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile, supabase } = await getSessionProfile();
  const { data: wallet } = await supabase.from("credit_wallets").select("available").eq("user_id", profile.id).single();
  const initials = (profile.full_name || profile.email).split(/\s+/).map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen">
      <Sidebar isAdmin={profile.role === "admin"} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-bg/80 px-4 backdrop-blur-xl md:px-8">
          <MobileNav isAdmin={profile.role === "admin"} />
          <div className="flex-1" />
          <Link href="/dashboard/billing" className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm hover:border-brand/40">
            <Coins className="h-4 w-4 text-warning" /><span className="font-semibold tabular-nums">{wallet?.available?.toLocaleString() ?? 0}</span><span className="hidden text-muted sm:inline">credits</span>
          </Link>
          <NotificationBell />
          <details className="relative">
            <summary className="grid h-9 w-9 cursor-pointer list-none place-items-center rounded-full bg-gradient-to-br from-brand to-accent text-xs font-semibold text-white">{initials}</summary>
            <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-border bg-surface p-2 shadow-2xl">
              <div className="px-3 py-2 text-sm"><div className="font-medium">{profile.full_name || "Your account"}</div><div className="truncate text-xs text-muted">{profile.email}</div></div>
              <Link href="/dashboard/settings" className="block rounded-lg px-3 py-2 text-sm hover:bg-surface-2">Settings</Link>
              <form action="/auth/signout" method="post"><button className="w-full rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-surface-2">Log out</button></form>
            </div>
          </details>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-8">
          {profile.account_status === "suspended" && <Alert tone="danger" className="mb-6">Your account is suspended. You can view your projects but can&apos;t create new videos. Contact support.</Alert>}
          {children}
        </main>
      </div>
    </div>
  );
}
