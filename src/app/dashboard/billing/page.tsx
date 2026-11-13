import type { Metadata } from "next";
import { Coins, Lock } from "lucide-react";
import { getSessionProfile } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/misc";
import { PlanCard } from "@/components/marketing/plan-card";
import { BuyButton, PaymentVerifier } from "@/components/dashboard/billing-actions";
import { formatDate, formatDateTime, formatMoney } from "@/lib/utils";
import type { Plan } from "@/lib/types";

export const metadata: Metadata = { title: "Billing" };

const TX_LABEL: Record<string, string> = { grant: "Grant", purchase: "Purchase", reservation: "Reserved", debit: "Charged", release: "Released", refund: "Refund", admin_adjustment: "Adjustment" };

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ reference?: string; plan?: string }> }) {
  const { reference, plan: wantedPlan } = await searchParams;
  const { profile, supabase } = await getSessionProfile();
  const [{ data: wallet }, { data: sub }, { data: plans }, { data: txs }, { data: payments }] = await Promise.all([
    supabase.from("credit_wallets").select("available, reserved").eq("user_id", profile.id).single(),
    supabase.from("subscriptions").select("renews_at, plans(*)").eq("status", "active").maybeSingle(),
    supabase.from("plans").select("*").order("sort_order"),
    supabase.from("credit_transactions").select("*").order("created_at", { ascending: false }).limit(25),
    supabase.from("payments").select("*, plans(name)").order("created_at", { ascending: false }).limit(10),
  ]);
  const current = sub?.plans as unknown as Plan | null;
  const monthly = (plans ?? []).filter((p: Plan) => p.billing_interval === "month") as Plan[];
  const packs = (plans ?? []).filter((p: Plan) => p.billing_interval === "one_time") as Plan[];
  const paymentsReady = Boolean(process.env.PAYSTACK_SECRET_KEY);

  return (
    <div className="space-y-8">
      <PageHeader title="Billing & credits" description="Manage your plan, buy credits and review usage." />
      {reference && <PaymentVerifier reference={reference} />}
      {!paymentsReady && <p className="flex items-center gap-2 text-xs text-muted"><Lock className="h-3.5 w-3.5" /> Checkout is disabled until Paystack keys are configured.</p>}

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent><p className="text-xs text-muted">Available credits</p><p className="mt-1 flex items-center gap-2 text-3xl font-semibold tabular-nums"><Coins className="h-6 w-6 text-warning" />{wallet?.available?.toLocaleString() ?? 0}</p></CardContent></Card>
        <Card><CardContent><p className="text-xs text-muted">Reserved for videos in progress</p><p className="mt-1 text-3xl font-semibold tabular-nums">{wallet?.reserved ?? 0}</p></CardContent></Card>
        <Card><CardContent><p className="text-xs text-muted">Current plan</p><p className="mt-1 text-xl font-semibold">{current?.name ?? "Free"}</p>{sub?.renews_at && <p className="mt-1 text-xs text-muted">Renews {formatDate(sub.renews_at)}</p>}</CardContent></Card>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Plans</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {monthly.map((p) => (
            <PlanCard key={p.id} plan={p} highlight={wantedPlan ? p.slug === wantedPlan : p.slug === "creator"}
              action={current?.id === p.id ? <Badge tone="success" className="w-full justify-center py-2">Current plan</Badge>
                : p.price_minor === 0 ? <p className="text-center text-xs text-muted">Included</p>
                : <BuyButton planId={p.id} label={`Upgrade to ${p.name}`} disabled={!paymentsReady} variant={p.slug === (wantedPlan ?? "creator") ? "default" : "secondary"} />} />
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">Plans are billed for 30 days per payment. Credits are added as soon as Paystack confirms the payment.</p>
      </section>

      {packs.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Top up</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {packs.map((p) => (
              <Card key={p.id}><CardContent className="flex items-center justify-between gap-4">
                <div><p className="font-medium">{p.name}</p><p className="text-sm text-muted">{formatMoney(p.price_minor, p.currency)}</p></div>
                <div className="w-32"><BuyButton planId={p.id} label="Buy" variant="secondary" disabled={!paymentsReady} /></div>
              </CardContent></Card>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface">
          <h2 className="border-b border-border px-5 py-3 font-semibold">Credit history</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted"><tr><th className="px-5 py-2 font-medium">Date</th><th className="px-2 py-2 font-medium">Type</th><th className="px-2 py-2 font-medium">Description</th><th className="px-5 py-2 text-right font-medium">Credits</th></tr></thead>
              <tbody>
                {(txs ?? []).map((t) => (
                  <tr key={t.id} className="border-t border-border/60">
                    <td className="whitespace-nowrap px-5 py-2.5 text-muted">{formatDateTime(t.created_at)}</td>
                    <td className="px-2 py-2.5">{TX_LABEL[t.type] ?? t.type}</td>
                    <td className="px-2 py-2.5 text-muted">{t.description}</td>
                    <td className={`px-5 py-2.5 text-right tabular-nums ${t.amount > 0 ? "text-success" : t.amount < 0 ? "text-fg" : "text-muted"}`}>{t.amount > 0 ? "+" : ""}{t.amount}</td>
                  </tr>
                ))}
                {!txs?.length && <tr><td colSpan={4} className="px-5 py-6 text-center text-muted">No transactions yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <section className="rounded-2xl border border-border bg-surface">
          <h2 className="border-b border-border px-5 py-3 font-semibold">Payments</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted"><tr><th className="px-5 py-2 font-medium">Date</th><th className="px-2 py-2 font-medium">Item</th><th className="px-2 py-2 font-medium">Amount</th><th className="px-5 py-2 text-right font-medium">Status</th></tr></thead>
              <tbody>
                {(payments ?? []).map((p) => (
                  <tr key={p.id} className="border-t border-border/60">
                    <td className="whitespace-nowrap px-5 py-2.5 text-muted">{formatDateTime(p.created_at)}</td>
                    <td className="px-2 py-2.5">{(p.plans as { name: string } | null)?.name ?? "Credits"}</td>
                    <td className="px-2 py-2.5">{formatMoney(p.amount_minor, p.currency)}</td>
                    <td className="px-5 py-2.5 text-right"><Badge tone={p.status === "success" ? "success" : p.status === "pending" ? "warning" : "danger"}>{p.status}</Badge></td>
                  </tr>
                ))}
                {!payments?.length && <tr><td colSpan={4} className="px-5 py-6 text-center text-muted">No payments yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
