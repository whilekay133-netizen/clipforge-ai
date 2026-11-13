"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#use-cases", label: "Use cases" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-bg/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm text-muted md:flex">
          {links.map((l) => <Link key={l.href} href={l.href} className="transition-colors hover:text-fg">{l.label}</Link>)}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>Log in</Link>
          <Link href="/register" className={buttonVariants({ size: "sm" })}>Start free</Link>
        </div>
        <button className="md:hidden" aria-label="Toggle menu" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      </div>
      <div className={cn("border-t border-border md:hidden", open ? "block" : "hidden")}>
        <nav className="flex flex-col gap-1 px-5 py-4">
          {links.map((l) => <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-lg px-2 py-2 text-muted hover:bg-surface-2 hover:text-fg">{l.label}</Link>)}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link href="/login" className={buttonVariants({ variant: "secondary" })}>Log in</Link>
            <Link href="/register" className={buttonVariants()}>Start free</Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
