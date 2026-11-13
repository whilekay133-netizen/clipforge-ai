import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { Logo } from "@/components/logo";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-bg/80 px-5 backdrop-blur-xl md:px-8">
        <div className="flex items-center gap-4"><Logo href="/admin" /><span className="flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-xs text-warning"><Shield className="h-3 w-3" /> Admin</span></div>
        <Link href="/dashboard" className="flex items-center gap-1 text-sm text-muted hover:text-fg"><ArrowLeft className="h-4 w-4" /> Back to app</Link>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-8 md:px-8">{children}</main>
    </div>
  );
}
