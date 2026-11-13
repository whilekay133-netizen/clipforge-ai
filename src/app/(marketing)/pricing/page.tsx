import Link from "next/link";
import type { Metadata } from "next";
import { buttonVariants } from "@/components/ui/button";
import { PlanCard } from "@/components/marketing/plan-card";
import { getPublicPlans } from "@/lib/plans";
import { FAQS } from "@/components/marketing/faq-data";

export const metadata: Metadata = { title: "Pricing" };
export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const plans = await getPublicPlans();
  const subscriptions = plans?.filter((p) => p.billing_interval === "month") ?? [];
  const packs = plans?.filter((p) => p.billing_interval === "one_time") ?? [];
  return (
    <div className="mx-auto max-w-6xl px-5 py-20">
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Simple, credit-based pricing</h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted">Every plan includes monthly credits. You see the exact estimate before each video, and failed jobs are refunded automatically.</p>
      </div>
      {plans === null ? (
        <p className="mt-16 rounded-2xl border border-border bg-surface p-8 text-center text-muted">Plans are being configured. Check back shortly.</p>
      ) : (
        <>
          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {subscriptions.map((p) => (
              <PlanCard key={p.id} plan={p} highlight={p.slug === "creator"}
                action={<Link href={p.price_minor === 0 ? "/register" : `/register?plan=${p.slug}`} className={buttonVariants({ variant: p.slug === "creator" ? "default" : "secondary", className: "w-full" })}>{p.price_minor === 0 ? "Start free" : `Choose ${p.name}`}</Link>} />
            ))}
          </div>
          {packs.length > 0 && (
            <div className="mt-10 rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
              Need more? Top-up packs are available from your billing page: {packs.map((p) => p.name).join(", ")}.
            </div>
          )}
        </>
      )}
      <div className="mx-auto mt-20 max-w-3xl">
        <h2 className="text-center text-2xl font-semibold">Billing questions</h2>
        <div className="mt-8 divide-y divide-border rounded-2xl border border-border bg-surface">
          {FAQS.filter((f) => /credit|fail|payment/i.test(f.q)).map((f) => (
            <div key={f.q} className="px-6 py-5"><h3 className="font-medium">{f.q}</h3><p className="mt-2 text-sm text-muted">{f.a}</p></div>
          ))}
        </div>
      </div>
    </div>
  );
}
