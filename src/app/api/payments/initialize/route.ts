import crypto from "crypto";
import { z } from "zod";
import { handle, json, HttpError } from "@/lib/http";
import { requireApiUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { paymentProvider } from "@/lib/payments/paystack";
import { appUrl } from "@/lib/env";

export const POST = handle(async (req: Request) => {
  const { profile } = await requireApiUser();
  const { planId } = z.object({ planId: z.string().uuid() }).parse(await req.json());
  const admin = createAdminClient();
  const { data: plan } = await admin.from("plans").select("*").eq("id", planId).eq("is_active", true).maybeSingle();
  if (!plan || plan.price_minor <= 0) throw new HttpError(400, "This plan can't be purchased.");

  const reference = `cf_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
  const { error } = await admin.from("payments").insert({
    user_id: profile.id, plan_id: plan.id, provider: "paystack", reference, amount_minor: plan.price_minor,
    currency: plan.currency, status: "pending", credits: plan.monthly_credits, metadata: { plan_slug: plan.slug },
  });
  if (error) throw new Error(error.message);

  const provider = paymentProvider();
  const { authorizationUrl } = await provider.initialize({
    email: profile.email, amountMinor: plan.price_minor, currency: plan.currency, reference,
    callbackUrl: `${appUrl()}/dashboard/billing?reference=${reference}`,
    metadata: { user_id: profile.id, plan_id: plan.id },
  });
  return json({ authorizationUrl, reference });
});
