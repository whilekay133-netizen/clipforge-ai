"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/ui/password-input";

export function ProfileForm({ fullName, email }: { fullName: string; email: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  return (
    <form className="space-y-4" onSubmit={async (e) => {
      e.preventDefault();
      setSaving(true);
      const full_name = String(new FormData(e.currentTarget).get("full_name"));
      const res = await fetch("/api/auth/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ full_name }) });
      const body = await res.json().catch(() => ({}));
      setSaving(false);
      setMsg(res.ok ? { tone: "success", text: "Profile updated." } : { tone: "danger", text: body.error ?? "Could not save." });
      if (res.ok) router.refresh();
    }}>
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      <div><Label htmlFor="full_name">Full name</Label><Input id="full_name" name="full_name" defaultValue={fullName} required maxLength={120} /></div>
      <div><Label>Email</Label><Input value={email} disabled /></div>
      <Button disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
    </form>
  );
}

export function PasswordForm() {
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  return (
    <form className="space-y-4" onSubmit={async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const fd = new FormData(form);
      const password = String(fd.get("password"));
      if (password.length < 8) return setMsg({ tone: "danger", text: "Use at least 8 characters." });
      if (password !== fd.get("confirm")) return setMsg({ tone: "danger", text: "Passwords don't match." });
      setSaving(true);
      const { error } = await createClient().auth.updateUser({ password });
      setSaving(false);
      setMsg(error ? { tone: "danger", text: error.message } : { tone: "success", text: "Password updated." });
      if (!error) form.reset();
    }}>
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label htmlFor="password">New password</Label><PasswordInput id="password" name="password" autoComplete="new-password" required /></div>
        <div><Label htmlFor="confirm">Confirm</Label><PasswordInput id="confirm" name="confirm" autoComplete="new-password" required /></div>
      </div>
      <Button variant="secondary" disabled={saving}>{saving ? "Updating…" : "Update password"}</Button>
    </form>
  );
}
