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

const ERRORS: Record<string, string> = {
  auth_callback: "That sign-in link is invalid or expired. Please try again.",
  not_configured: "Authentication isn't configured yet (missing Supabase environment variables).",
};

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const rawNext = params.get("next") ?? "/dashboard";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";
  const [error, setError] = useState(ERRORS[params.get("error") ?? ""] ?? "");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const { error } = await createClient().auth.signInWithPassword({ email: String(form.get("email")), password: String(form.get("password")) });
    if (error) {
      setError(error.message === "Email not confirmed" ? "Please verify your email first — check your inbox." : "Incorrect email or password.");
      setLoading(false);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <>
      <h1 className="text-xl font-semibold">Welcome back</h1>
      <p className="mt-1 text-sm text-muted">Log in to continue creating.</p>
      <div className="mt-6"><GoogleButton next={next} /></div>
      <Divider />
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <Alert tone="danger">{error}</Alert>}
        <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="email" required /></div>
        <div>
          <div className="flex items-center justify-between"><Label htmlFor="password">Password</Label><Link href="/forgot-password" className="mb-1.5 text-xs text-brand-soft hover:underline">Forgot?</Link></div>
          <PasswordInput id="password" name="password" autoComplete="current-password" required />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing in…" : "Log in"}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">New to ClipForge? <Link href="/register" className="text-brand-soft hover:underline">Create an account</Link></p>
    </>
  );
}
