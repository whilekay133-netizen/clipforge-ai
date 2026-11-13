import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { grantCredits } from "@/lib/credits";
import { notify } from "@/lib/notifications";
import type { VerifiedPayment } from "./types";

/**
 * Apply a provider-verified payment. Idempotent: credits are granted with reference "payment:<ref>",
 * so repeated webhooks or verify calls never double-credit.
 */
export async function fulfilPayment(admin: SupabaseClient, verified: VerifiedPayment) {
  const { data: payment } = await admin.from("payments").select("*, plans(*)").eq("reference", verified.reference).maybeSingle();
  if (!payment) return { ok: false as const, reason: "unknown_reference" };

  if (verified.status !== "success") {
    if (payment.status === "pending") await admin.from("payments").update({ status: verified.status }).eq("id", payment.id);
    return { ok: false as const, reason: verified.status };
  }
  if (verified.amountMinor !== payment.amount_minor || verified.currency !== payment.currency) {
    console.error("[payments] amount/currency mismatch", verified.reference);
    return { ok: false as const, reason: "mismatch" };
  }

  await grantCredits(admin, payment.user_id, payment.credits, "purchase", `payment:${payment.reference}`, `${payment.plans?.name ?? "Credits"} purchase`);

  const { data: updated } = await admin
    .from("payments")
    .update({ status: "success", verified_at: new Date().toISOString() })
    .eq("id", payment.id)
    .neq("status", "success")
    .select("id");

  // First time we see this success: activate subscription + notify.
  if (updated && updated.length > 0) {
    if (payment.plans?.billing_interval === "month") {
      const now = new Date();
      const renews = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
      await admin.from("subscriptions").update({ status: "cancelled", cancelled_at: now.toISOString() }).eq("user_id", payment.user_id).eq("status", "active");
      await admin.from("subscriptions").insert({ user_id: payment.user_id, plan_id: payment.plan_id, status: "active", provider: "paystack", started_at: now.toISOString(), renews_at: renews.toISOString() });
    }
    await notify(admin, payment.user_id, {
      title: "Payment confirmed",
      message: `${payment.credits.toLocaleString()} credits were added to your wallet.`,
      type: "success",
      link: "/dashboard/billing",
    });
  }
  return { ok: true as const };
}
