import Link from "next/link";
import { ArrowRight, CheckCircle2, Coins, Film, Loader2, Plus, Sparkles } from "lucide-react";
import { getSessionProfile } from "@/lib/auth";
import { ACTIVE_STATUSES, TEMPLATES } from "@/lib/catalog";
import { signedUrls } from "@/lib/storage";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { ProjectCard } from "@/components/dashboard/project-card";
import { FilmStrip } from "@/components/motion/film-strip";
import { LivePlayer } from "@/components/motion/live-player";

export default async function DashboardPage() {
  const { profile, supabase } = await getSessionProfile();
  const [{ count: total }, { count: processing }, { count: completed }, { data: wallet }, { data: recent }, { data: sub }] = await Promise.all([
    supabase.from("projects").select("id", { count: "exact", head: true }),
    supabase.from("projects").select("id", { count: "exact", head: true }).in("status", ACTIVE_STATUSES),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("credit_wallets").select("available, reserved").eq("user_id", profile.id).single(),
    supabase.from("projects").select("id, title, mode, category, status, created_at, duration_sec, aspect_ratio, resolution, thumbnail_path").order("created_at", { ascending: false }).limit(6),
    supabase.from("subscriptions").select("plans(name)").eq("status", "active").maybeSingle(),
  ]);
  const thumbs = await signedUrls(supabase, (recent ?? []).map((p) => p.thumbnail_path).filter(Boolean) as string[]);
  const firstName = profile.full_name.split(" ")[0] || "there";
  const planName = (sub?.plans as unknown as { name: string } | null)?.name ?? "Free";

  const stats = [
    { label: "Total videos", value: total ?? 0, icon: Film, tone: "text-brand-soft" },
    { label: "Processing", value: processing ?? 0, icon: Loader2, tone: "text-accent" },
    { label: "Completed", value: completed ?? 0, icon: CheckCircle2, tone: "text-success" },
    { label: "Available credits", value: wallet?.available ?? 0, icon: Coins, tone: "text-warning", href: "/dashboard/billing" },
  ];

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-brand/30 bg-gradient-to-br from-brand/20 via-surface to-surface p-7 md:p-9">
        <FilmStrip rows={1} className="absolute inset-x-0 bottom-0 opacity-15" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-sm text-brand-soft">{planName} plan</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">Welcome back, {firstName}</h1>
            <p className="mt-2 max-w-lg text-sm text-muted">Describe your next video and we&apos;ll handle the script, scenes, voiceover and render.</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden w-64 lg:block"><LivePlayer aspectRatio="16:9" showControls={false} label="Your next video" /></div>
            <Link href="/dashboard/create" className={buttonVariants({ size: "lg" })}><Plus className="h-5 w-5" /> Create video</Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => {
          const inner = (
            <Card className="h-full transition-colors hover:border-brand/30">
              <CardContent className="flex items-center justify-between">
                <div><p className="text-xs text-muted">{s.label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{s.value.toLocaleString()}</p></div>
                <s.icon className={`h-6 w-6 ${s.tone}`} />
              </CardContent>
            </Card>
          );
          return s.href ? <Link key={s.label} href={s.href}>{inner}</Link> : <div key={s.label}>{inner}</div>;
        })}
      </div>
      {(wallet?.reserved ?? 0) > 0 && <p className="-mt-4 text-xs text-muted">{wallet!.reserved} credits are reserved for videos in progress.</p>}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent projects</h2>
          <Link href="/dashboard/projects" className="flex items-center gap-1 text-sm text-brand-soft hover:underline">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
        {recent && recent.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {recent.map((p) => <ProjectCard key={p.id} p={{ ...p, thumbnail_url: p.thumbnail_path ? thumbs[p.thumbnail_path] ?? null : null }} />)}
          </div>
        ) : (
          <EmptyState icon={Film} title="No videos yet" description="Your projects will appear here. Start with a blank brief or one of the templates below."
            action={<Link href="/dashboard/create" className={buttonVariants()}><Plus className="h-4 w-4" /> Create your first video</Link>} />
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Quick start</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.slice(0, 3).map((t) => (
            <Link key={t.id} href={`/dashboard/create?template=${t.id}`} className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 hover:border-brand/40">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-soft" />
              <div><p className="text-sm font-medium">{t.name}</p><p className="mt-0.5 text-xs text-muted">{t.durationSec}s · {t.aspectRatio} · {t.style}</p></div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
