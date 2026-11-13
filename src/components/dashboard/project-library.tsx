"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, FolderKanban, Plus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState, Skeleton, Alert } from "@/components/ui/misc";
import { ProjectCard, type ProjectCardData } from "./project-card";
import { cn } from "@/lib/utils";

const FILTERS = [
  { id: "all", label: "All" }, { id: "completed", label: "Completed" }, { id: "processing", label: "Processing" },
  { id: "failed", label: "Failed" }, { id: "drafts", label: "Drafts" },
];

export function ProjectLibrary() {
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: ProjectCardData[]; total: number; pageSize: number } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setData(null);
    fetch(`/api/projects?filter=${filter}&page=${page}&pageSize=12`, { cache: "no-store" })
      .then(async (r) => { const b = await r.json(); if (!r.ok) throw new Error(b.error); if (!cancelled) setData(b); })
      .catch((e) => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, [filter, page]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => { setFilter(f.id); setPage(1); }}
            className={cn("rounded-full border px-3.5 py-1.5 text-sm", filter === f.id ? "border-brand bg-brand/15" : "border-border text-muted hover:text-fg")}>{f.label}</button>
        ))}
      </div>
      {error && <Alert tone="danger">{error}</Alert>}
      {!data && !error && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />)}</div>}
      {data && data.items.length === 0 && (
        <EmptyState icon={FolderKanban} title={filter === "all" ? "No projects yet" : "Nothing here"} description={filter === "all" ? "Create your first video to see it here." : "No projects match this filter."}
          action={<Link href="/dashboard/create" className={buttonVariants()}><Plus className="h-4 w-4" /> Create video</Link>} />
      )}
      {data && data.items.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{data.items.map((p) => <ProjectCard key={p.id} p={p} />)}</div>
          {pages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3 text-sm">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /> Prev</Button>
              <span className="text-muted">Page {page} of {pages}</span>
              <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next <ChevronRight className="h-4 w-4" /></Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
