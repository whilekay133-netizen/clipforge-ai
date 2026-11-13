"use client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const email = String(new FormData(e.currentTarget).get("email"));
    const { error } = await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` });
    setLoading(false);
    if (error) setError(error.message); else setSent(true);
  }
  return (
    <>
      <h1 className="text-xl font-semibold">Reset your password</h1>
      <p className="mt-1 text-sm text-muted">We&apos;ll email you a secure reset link.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {sent && <Alert tone="success">If an account exists for that email, a reset link is on its way.</Alert>}
        {error && <Alert tone="danger">{error}</Alert>}
        <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required /></div>
        <Button className="w-full" disabled={loading}>{loading ? "Sending…" : "Send reset link"}</Button>
      </form>
      <p className="mt-6 text-center text-sm"><Link href="/login" className="text-brand-soft hover:underline">Back to log in</Link></p>
    </>
  );
}
