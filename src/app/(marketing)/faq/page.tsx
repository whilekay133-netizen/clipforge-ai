import type { Metadata } from "next";
import { FAQS } from "@/components/marketing/faq-data";

export const metadata: Metadata = { title: "FAQ" };

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-20">
      <h1 className="text-center text-4xl font-semibold tracking-tight">Frequently asked questions</h1>
      <div className="mt-12 divide-y divide-border rounded-2xl border border-border bg-surface">
        {FAQS.map((f) => (
          <details key={f.q} className="group px-6 py-5" open>
            <summary className="flex cursor-pointer list-none items-center justify-between font-medium">{f.q}<span className="text-muted transition-transform group-open:rotate-45">+</span></summary>
            <p className="mt-3 text-sm text-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
