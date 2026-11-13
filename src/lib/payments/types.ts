export interface InitializePaymentInput {
  email: string;
  amountMinor: number;
  currency: string;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}
export interface VerifiedPayment {
  reference: string;
  status: "success" | "failed" | "abandoned" | "pending";
  amountMinor: number;
  currency: string;
  metadata: Record<string, unknown>;
}
export interface PaymentProvider {
  readonly name: string;
  initialize(input: InitializePaymentInput): Promise<{ authorizationUrl: string; reference: string }>;
  verify(reference: string): Promise<VerifiedPayment>;
  verifyWebhookSignature(rawBody: string, signature: string | null): boolean;
}
