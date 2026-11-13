import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-5 text-center">
      <div>
        <p className="font-mono text-sm text-brand-soft">404</p>
        <h1 className="mt-2 text-3xl font-semibold">This page doesn&apos;t exist</h1>
        <p className="mt-2 text-muted">It may have been moved or deleted.</p>
        <Link href="/" className={buttonVariants({ className: "mt-6" })}>Go home</Link>
      </div>
    </div>
  );
}
