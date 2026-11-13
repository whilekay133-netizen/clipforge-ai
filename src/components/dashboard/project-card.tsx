import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, MODES, statusTone, ACTIVE_STATUSES } from "@/lib/catalog";
import { cn, formatDate, formatDuration } from "@/lib/utils";
import type { ProjectStatus } from "@/lib/types";

export interface ProjectCardData {
  id: string;
  title: string;
  mode: string;
  category: string | null;
  status: ProjectStatus;
  created_at: string;
  duration_sec: number | null;
  aspect_ratio: string | null;
  resolution: string | null;
  thumbnail_url: string | null;
}

export function ProjectCard({ p }: { p: ProjectCardData }) {
  const active = ACTIVE_STATUSES.includes(p.status);
  return (
    <Link href={`/dashboard/projects/${p.id}`} className="group overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-brand/40">
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-surface-2 to-[#1a1438]">
        {p.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.thumbnail_url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]" />
        ) : (
          <div className="grid h-full place-items-center text-muted/60"><Clapperboard className={cn("h-8 w-8", active && "animate-pulse")} /></div>
        )}
        <div className="absolute left-2 top-2"><Badge tone={statusTone(p.status)}>{STATUS_LABEL[p.status]}</Badge></div>
        {p.duration_sec ? <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[11px]">{formatDuration(Number(p.duration_sec))}</span> : null}
      </div>
      <div className="p-4">
        <h3 className="truncate font-medium">{p.title}</h3>
        <p className="mt-1 truncate text-xs text-muted">
          {MODES.find((m) => m.id === p.mode)?.name ?? p.mode}{p.category ? ` · ${p.category}` : ""} · {formatDate(p.created_at)}
          {p.aspect_ratio ? ` · ${p.aspect_ratio}` : ""}{p.resolution ? ` · ${p.resolution}` : ""}
        </p>
      </div>
    </Link>
  );
}
