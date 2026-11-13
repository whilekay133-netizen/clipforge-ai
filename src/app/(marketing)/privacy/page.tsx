import type { Metadata } from "next";
import { ProsePage } from "@/components/marketing/prose-page";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <ProsePage title="Privacy policy" updated="13 November 2026">
      <p>This template describes how ClipForge AI handles personal data. Have it reviewed by a qualified lawyer for your jurisdiction (including the Nigeria Data Protection Act 2023 and GDPR where applicable) before launch.</p>
      <h2>What we collect</h2>
      <ul>
        <li>Account data: name, email address, password hash (managed by our authentication provider) and optional avatar.</li>
        <li>Content: prompts, settings, uploaded images and the videos, audio and subtitles generated for you.</li>
        <li>Billing data: plan, credit transactions and payment references. Card details are handled by Paystack and never stored by us.</li>
        <li>Usage and diagnostic data: logs, error reports and product analytics.</li>
      </ul>
      <h2>How we use it</h2>
      <ul>
        <li>To generate, store and deliver your videos.</li>
        <li>To bill you, prevent fraud and enforce our content policy.</li>
        <li>To keep the service reliable and improve it.</li>
      </ul>
      <h2>AI providers</h2>
      <p>To produce a video, relevant parts of your prompt and generated script are sent to the AI providers that power ClipForge (for example Anthropic for scripts, fal.ai for video and voice). They process this data to return results to us under their own terms.</p>
      <h2>Storage and access</h2>
      <p>Media is stored in private storage. Only you can access your projects; files are delivered through short-lived signed links.</p>
      <h2>Your rights</h2>
      <p>You can access, correct, export or delete your data. Deleting a project removes its media. Contact us to delete your account.</p>
      <h2>Contact</h2>
      <p>Use the contact page for privacy questions.</p>
    </ProsePage>
  );
}
