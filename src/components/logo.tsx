import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand to-accent shadow-[0_6px_20px_-6px_rgb(139_92_246/0.8)]">
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="currentColor" aria-hidden><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" /><path d="M4 7h2v10H4z" opacity=".5" /></svg>
      </span>
      <span>ClipForge<span className="text-brand-soft"> AI</span></span>
    </Link>
  );
}
