"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== form.get("confirm")) return setError("Passwords don't match.");
    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (error) return setError(error.message.includes("session") ? "Your reset link expired. Request a new one." : error.message);
    router.replace("/dashboard");
  }
  return (
    <>
      <h1 className="text-xl font-semibold">Choose a new password</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {error && <Alert tone="danger">{error}</Alert>}
        <div><Label htmlFor="password">New password</Label><Input id="password" name="password" type="password" autoComplete="new-password" required /></div>
        <div><Label htmlFor="confirm">Confirm password</Label><Input id="confirm" name="confirm" type="password" autoComplete="new-password" required /></div>
        <Button className="w-full" disabled={loading}>{loading ? "Saving…" : "Update password"}</Button>
      </form>
    </>
  );
}
