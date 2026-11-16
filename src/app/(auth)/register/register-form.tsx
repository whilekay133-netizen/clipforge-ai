"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { Divider, GoogleButton } from "@/components/auth/google-button";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/ui/password-input";

export function RegisterForm() {
  const router = useRouter();
  const plan = useSearchParams().get("plan");
  const next = plan ? `/dashboard/billing?plan=${encodeURIComponent(plan)}` : "/dashboard";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    if (password.length < 8) return setError("Use at least 8 characters for your password.");
    setLoading(true);
    setError("");
    const { data, error } = await createClient().auth.signUp({
      email: String(form.get("email")),
      password,
      options: { data: { full_name: String(form.get("full_name")).trim() }, emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) { setError(error.message); setLoading(false); return; }
    if (data.session) { router.replace(next); router.refresh(); }
    else router.replace(`/verify-email?email=${encodeURIComponent(String(form.get("email")))}`);
  }

  return (
    <>
      <h1 className="text-xl font-semibold">Create your account</h1>
      <p className="mt-1 text-sm text-muted">100 free credits. No card required.</p>
      <div className="mt-6"><GoogleButton next={next} /></div>
      <Divider />
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <Alert tone="danger">{error}</Alert>}
        <div><Label htmlFor="full_name">Full name</Label><Input id="full_name" name="full_name" autoComplete="name" required maxLength={120} /></div>
        <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="email" required /></div>
        <div><Label htmlFor="password">Password</Label><PasswordInput id="password" name="password" autoComplete="new-password" minLength={8} required /></div>
        <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating account…" : "Create account"}</Button>
        <p className="text-center text-xs text-muted">By signing up you agree to our <Link href="/terms" className="underline">Terms</Link>, <Link href="/privacy" className="underline">Privacy policy</Link> and <Link href="/content-policy" className="underline">Content policy</Link>.</p>
      </form>
      <p className="mt-6 text-center text-sm text-muted">Already have an account? <Link href="/login" className="text-brand-soft hover:underline">Log in</Link></p>
    </>
  );
}
