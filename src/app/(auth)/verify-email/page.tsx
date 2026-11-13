import Link from "next/link";
import { MailCheck } from "lucide-react";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <div className="text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-brand/15 text-brand-soft"><MailCheck className="h-6 w-6" /></div>
      <h1 className="mt-4 text-xl font-semibold">Check your inbox</h1>
      <p className="mt-2 text-sm text-muted">We sent a verification link{email ? <> to <span className="text-fg">{email}</span></> : null}. Open it to activate your account.</p>
      <Link href="/login" className="mt-6 inline-block text-sm text-brand-soft hover:underline">Back to log in</Link>
    </div>
  );
}
