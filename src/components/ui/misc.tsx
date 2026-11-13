import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-lg", className)} />;
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-14 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-brand/10 text-brand-soft"><Icon className="h-6 w-6" /></div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Alert({ tone = "info", children, className }: { tone?: "info" | "danger" | "success" | "warning"; children: React.ReactNode; className?: string }) {
  const map = {
    info: "border-accent/30 bg-accent/5 text-accent",
    danger: "border-danger/30 bg-danger/5 text-danger",
    success: "border-success/30 bg-success/5 text-success",
    warning: "border-warning/30 bg-warning/5 text-warning",
  };
  return <div role="alert" className={cn("rounded-lg border px-3 py-2.5 text-sm", map[tone], className)}>{children}</div>;
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
