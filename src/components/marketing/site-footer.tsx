import Link from "next/link";
import { Logo } from "@/components/logo";

const cols = [
  { title: "Product", links: [["Pricing", "/pricing"], ["How it works", "/#how-it-works"], ["Use cases", "/#use-cases"], ["FAQ", "/faq"]] },
  { title: "Company", links: [["About", "/about"], ["Contact", "/contact"]] },
  { title: "Legal", links: [["Privacy policy", "/privacy"], ["Terms of service", "/terms"], ["Content policy", "/content-policy"]] },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted">Describe it. Configure it. Download a finished video.</p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h4 className="text-sm font-semibold">{c.title}</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              {c.links.map(([label, href]) => <li key={href}><Link href={href} className="hover:text-fg">{label}</Link></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border/60 py-5 text-center text-xs text-muted">© {new Date().getFullYear()} ClipForge AI. All rights reserved.</div>
    </footer>
  );
}
