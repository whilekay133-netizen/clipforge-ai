import type { Metadata } from "next";
import { ProsePage } from "@/components/marketing/prose-page";

export const metadata: Metadata = { title: "Content policy" };

export default function ContentPolicyPage() {
  return (
    <ProsePage title="Content policy" updated="13 November 2026">
      <p>ClipForge AI must not be used to create:</p>
      <ul>
        <li>Sexual content involving minors, or any sexualisation of minors.</li>
        <li>Non-consensual intimate imagery, or sexual content depicting real people.</li>
        <li>Targeted harassment, bullying or threats of violence.</li>
        <li>Fraudulent impersonation, or deceptive content presented as real footage of real people or events.</li>
        <li>Content that promotes terrorism, self-harm or illegal activity.</li>
        <li>Content that infringes copyright, trademarks or other rights.</li>
      </ul>
      <h2>Uploads and likeness</h2>
      <p>Only upload images you have the right to use. You need consent from anyone identifiable in an upload. Voice cloning is not offered without verified authorisation from the voice owner.</p>
      <h2>Enforcement</h2>
      <p>Requests are screened automatically and scripts are reviewed by our AI before any media is generated. Violating requests are declined and refunded; repeated violations lead to suspension. Report content through the contact page.</p>
    </ProsePage>
  );
}
