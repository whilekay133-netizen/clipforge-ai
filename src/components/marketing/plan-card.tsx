import { Check } from "lucide-react";
import { cn, formatMoney } from "@/lib/utils";
import type { Plan } from "@/lib/types";

export function PlanCard({ plan, highlight, action }: { plan: Plan; highlight?: boolean; action: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col rounded-2xl border bg-surface p-6", highlight ? "border-brand/60 shadow-[0_0_0_1px_rgb(139_92_246/0.4),0_20px_60px_-20px_rgb(139_92_246/0.5)]" : "border-border")}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{plan.name}</h3>
        {highlight && <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[11px] text-brand-soft">Most popular</span>}
      </div>
      <p className="mt-1 min-h-10 text-sm text-muted">{plan.description}</p>
      <div className="mt-5 flex items-baseline gap-1">
        <span className="text-3xl font-semibold">{plan.price_minor === 0 ? "Free" : formatMoney(plan.price_minor, plan.currency)}</span>
        {plan.price_minor > 0 && <span className="text-sm text-muted">{plan.billing_interval === "month" ? "/ month" : "one-time"}</span>}
      </div>
      <ul className="mt-6 flex-1 space-y-2.5 text-sm">
        {plan.features.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />{f}</li>)}
      </ul>
      <div className="mt-6">{action}</div>
    </div>
  );
}
