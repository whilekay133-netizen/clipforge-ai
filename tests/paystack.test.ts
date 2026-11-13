import crypto from "crypto";
import { describe, expect, it } from "vitest";
import { paystackSignatureValid } from "@/lib/payments/paystack";

describe("paystack webhook signature", () => {
  const secret = "sk_test_123";
  const body = JSON.stringify({ event: "charge.success", data: { reference: "cf_1" } });
  const sig = crypto.createHmac("sha512", secret).update(body).digest("hex");

  it("accepts a valid signature", () => expect(paystackSignatureValid(body, sig, secret)).toBe(true));
  it("rejects a tampered body", () => expect(paystackSignatureValid(body + " ", sig, secret)).toBe(false));
  it("rejects a missing or malformed signature", () => {
    expect(paystackSignatureValid(body, null, secret)).toBe(false);
    expect(paystackSignatureValid(body, "abc", secret)).toBe(false);
  });
});
