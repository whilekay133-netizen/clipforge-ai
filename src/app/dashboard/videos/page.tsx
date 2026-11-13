import Link from "next/link";
import type { Metadata } from "next";
import { Download, Film, Plus } from "lucide-react";
import { getSessionProfile } from "@/lib/auth";
import { signedUrls } from "@/lib/storage";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { formatDate, formatDuration } from "@/lib/utils";

export const metadata: Metadata = { title: "Videos" };

export default async function VideosPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, Number((await searchParams).page ?? 1));
  const size = 12;
  const { supabase } = await getSessionProfile();
  const { data, count } = await supabase.from("projects").select("id, title, created_at, duration_sec, aspect_ratio, resolution, thumbnail_path", { count: "exact" })
    .eq("status", "completed").order("created_at", { ascending: false }).range((page - 1) * size, page * size - 1);
  const thumbs = await signedUrls(supabase, (data ?? []).map((v) => v.thumbnail_path).filter(Boolean) as string[]);
  const pages = Math.max(1, Math.ceil((count ?? 0) / size));

  return (
    <>
      <PageHeader title="Videos" description="Finished videos ready to download." />
      {!data?.length ? (
        <EmptyState icon={Film} title="No finished videos yet" description="Completed videos will appear here for download." action={<Link href="/dashboard/create" className={buttonVariants()}><Plus className="h-4 w-4" /> Create video</Link>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((v) => (
            <div key={v.id} className="overflow-hidden rounded-2xl border border-border bg-surface">
              <Link href={`/dashboard/projects/${v.id}`} className="block aspect-video bg-gradient-to-br from-surface-2 to-[#1a1438]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {v.thumbnail_path && thumbs[v.thumbnail_path] ? <img src={thumbs[v.thumbnail_path]} alt="" loading="lazy" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Film className="h-8 w-8 text-muted/60" /></div>}
              </Link>
              <div className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0"><p className="truncate font-medium">{v.title}</p><p className="text-xs text-muted">{formatDate(v.created_at)} · {formatDuration(Number(v.duration_sec))} · {v.aspect_ratio} · {v.resolution}</p></div>
                <a href={`/api/projects/${v.id}/download`} className={buttonVariants({ variant: "secondary", size: "icon" })} aria-label="Download"><Download className="h-4 w-4" /></a>
              </div>
            </div>
          ))}
        </div>
      )}
      {pages > 1 && (
        <div className="mt-8 flex justify-center gap-3 text-sm">
          {page > 1 && <Link href={`?page=${page - 1}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>Prev</Link>}
          <span className="self-center text-muted">Page {page} of {pages}</span>
          {page < pages && <Link href={`?page=${page + 1}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>Next</Link>}
        </div>
      )}
    </>
  );
}
