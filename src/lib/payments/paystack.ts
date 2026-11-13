import "server-only";
import crypto from "crypto";
import { requireEnv } from "@/lib/env";
import type { InitializePaymentInput, PaymentProvider, VerifiedPayment } from "./types";

const API = "https://api.paystack.co";

export function paystackSignatureValid(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const expected = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export class PaystackProvider implements PaymentProvider {
  readonly name = "paystack";

  private async call<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${requireEnv("PAYSTACK_SECRET_KEY")}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
      cache: "no-store",
    });
    const body = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string; data?: T };
    if (!res.ok || !body.status) throw new Error(`Paystack ${res.status}: ${body.message ?? "request failed"}`);
    return body.data as T;
  }

  async initialize(input: InitializePaymentInput) {
    const data = await this.call<{ authorization_url: string; reference: string }>("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email: input.email,
        amount: input.amountMinor,
        currency: input.currency,
        reference: input.reference,
        callback_url: input.callbackUrl,
        metadata: input.metadata,
      }),
    });
    return { authorizationUrl: data.authorization_url, reference: data.reference };
  }

  async verify(reference: string): Promise<VerifiedPayment> {
    const data = await this.call<{ status: string; amount: number; currency: string; reference: string; metadata: Record<string, unknown> | string }>(
      `/transaction/verify/${encodeURIComponent(reference)}`,
    );
    const status = (["success", "failed", "abandoned"].includes(data.status) ? data.status : "pending") as VerifiedPayment["status"];
    return { reference: data.reference, status, amountMinor: data.amount, currency: data.currency, metadata: typeof data.metadata === "object" && data.metadata ? data.metadata : {} };
  }

  verifyWebhookSignature(rawBody: string, signature: string | null) {
    return paystackSignatureValid(rawBody, signature, requireEnv("PAYSTACK_SECRET_KEY"));
  }
}

export const paymentProvider = (): PaymentProvider => new PaystackProvider();
