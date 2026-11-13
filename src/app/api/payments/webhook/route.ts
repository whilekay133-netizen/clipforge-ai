import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { paymentProvider } from "@/lib/payments/paystack";
import { fulfilPayment } from "@/lib/payments/fulfil";

/** Paystack webhook. Signature-verified, idempotent, and re-verifies the transaction with the API before crediting. */
export async function POST(req: Request) {
  const raw = await req.text();
  const provider = paymentProvider();
  let valid = false;
  try {
    valid = provider.verifyWebhookSignature(raw, req.headers.get("x-paystack-signature"));
  } catch {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  if (!valid) return NextResponse.json({ error: "invalid signature" }, { status: 401 });

  const event = JSON.parse(raw) as { event: string; data?: { reference?: string } };
  if (event.event === "charge.success" && event.data?.reference) {
    try {
      const verified = await provider.verify(event.data.reference);
      await fulfilPayment(createAdminClient(), verified);
    } catch (err) {
      console.error("[paystack webhook]", err instanceof Error ? err.message : err);
      return NextResponse.json({ error: "processing failed" }, { status: 500 }); // Paystack will retry
    }
  }
  return NextResponse.json({ received: true });
}
