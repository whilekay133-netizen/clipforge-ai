import type { Metadata } from "next";
import { ContactForm } from "@/components/marketing/contact-form";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="mx-auto grid max-w-5xl gap-12 px-5 py-20 md:grid-cols-[1fr_1.3fr]">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight">Talk to us</h1>
        <p className="mt-4 text-muted">Questions about plans, a business account, a failed video or a policy concern? Send a message and the team will reply by email.</p>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-6"><ContactForm /></div>
    </div>
  );
}
