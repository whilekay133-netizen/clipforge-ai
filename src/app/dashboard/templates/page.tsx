import Link from "next/link";
import type { Metadata } from "next";
import { LayoutTemplate } from "lucide-react";
import { MODES, TEMPLATES } from "@/lib/catalog";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Templates" };

export default function TemplatesPage() {
  return (
    <>
      <PageHeader title="Templates" description="Start from a proven brief and settings. Everything stays editable." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {TEMPLATES.map((t) => (
          <div key={t.id} className="flex flex-col rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2 text-xs text-brand-soft"><LayoutTemplate className="h-4 w-4" />{MODES.find((m) => m.id === t.mode)?.name}</div>
            <h3 className="mt-3 font-semibold">{t.name}</h3>
            <p className="mt-2 flex-1 text-sm text-muted">{t.prompt}</p>
            <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] text-muted">
              {[`${t.durationSec}s`, t.aspectRatio, t.style, t.category].map((x) => <span key={x} className="rounded-full border border-border px-2 py-0.5">{x}</span>)}
            </div>
            <Link href={`/dashboard/create?template=${t.id}`} className={buttonVariants({ variant: "secondary", className: "mt-4" })}>Use template</Link>
          </div>
        ))}
      </div>
    </>
  );
}
