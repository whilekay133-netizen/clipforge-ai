import { z } from "zod";
import { handle, json, HttpError } from "@/lib/http";
import { requireApiUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { paymentProvider } from "@/lib/payments/paystack";
import { fulfilPayment } from "@/lib/payments/fulfil";

/** Called when the user returns from checkout. The redirect is NOT proof of payment — we verify with Paystack. */
export const POST = handle(async (req: Request) => {
  const { profile } = await requireApiUser();
  const { reference } = z.object({ reference: z.string().min(6).max(100) }).parse(await req.json());
  const admin = createAdminClient();
  const { data: payment } = await admin.from("payments").select("user_id, status").eq("reference", reference).maybeSingle();
  if (!payment || payment.user_id !== profile.id) throw new HttpError(404, "Payment not found");
  if (payment.status === "success") return json({ status: "success" });
  const verified = await paymentProvider().verify(reference);
  const result = await fulfilPayment(admin, verified);
  return json({ status: result.ok ? "success" : verified.status });
});
