import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-surface-2 text-muted border-border",
  brand: "bg-brand/15 text-brand-soft border-brand/30",
  success: "bg-success/10 text-success border-success/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  danger: "bg-danger/10 text-danger border-danger/30",
  info: "bg-accent/10 text-accent border-accent/30",
};

export function Badge({ tone = "neutral", className, children }: { tone?: keyof typeof tones; className?: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", tones[tone], className)}>{children}</span>;
}
