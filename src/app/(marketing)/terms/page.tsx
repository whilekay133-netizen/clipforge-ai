import type { Metadata } from "next";
import { ProsePage } from "@/components/marketing/prose-page";

export const metadata: Metadata = { title: "Terms of service" };

export default function TermsPage() {
  return (
    <ProsePage title="Terms of service" updated="13 November 2026">
      <p>This is a starting template. Have it reviewed by a qualified lawyer before launch.</p>
      <h2>Your account</h2>
      <p>You must provide accurate information, keep your password secure and be at least 18 years old (or the age of majority where you live).</p>
      <h2>Credits and payments</h2>
      <ul>
        <li>Credits are consumed when a video completes. Credits reserved for failed or cancelled jobs are returned.</li>
        <li>Subscription credits renew monthly. Top-up credits do not expire while your account is active.</li>
        <li>Payments are processed by Paystack. Fees are non-refundable except where required by law or stated here.</li>
      </ul>
      <h2>Your content</h2>
      <p>You own your prompts, uploads and generated videos, subject to the rights of third parties and the terms of the underlying AI providers. You confirm you have the rights and consents needed for anything you upload, including images, voices and likenesses.</p>
      <h2>Acceptable use</h2>
      <p>You must follow our content policy. We may suspend accounts that violate it.</p>
      <h2>Service availability</h2>
      <p>AI generation depends on third-party providers. We aim for high availability but do not guarantee uninterrupted service or specific output quality.</p>
      <h2>Liability</h2>
      <p>To the extent permitted by law, our liability is limited to the amount you paid in the 3 months before the claim.</p>
    </ProsePage>
  );
}
