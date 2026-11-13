"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";

export function ContactForm() {
  const [state, setState] = useState<{ status: "idle" | "sending" | "sent" | "error"; message?: string }>({ status: "idle" });
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState({ status: "sending" });
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
    const body = await res.json().catch(() => ({}));
    if (res.ok) { setState({ status: "sent" }); (e.target as HTMLFormElement).reset(); }
    else setState({ status: "error", message: body.error ?? "Could not send your message." });
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {state.status === "sent" && <Alert tone="success">Thanks — we&apos;ll get back to you within two business days.</Alert>}
      {state.status === "error" && <Alert tone="danger">{state.message}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label htmlFor="name">Name</Label><Input id="name" name="name" required maxLength={120} /></div>
        <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required maxLength={200} /></div>
      </div>
      <div><Label htmlFor="subject">Subject</Label><Input id="subject" name="subject" maxLength={200} /></div>
      <div><Label htmlFor="message">Message</Label><Textarea id="message" name="message" required minLength={10} maxLength={5000} rows={6} /></div>
      <Button type="submit" disabled={state.status === "sending"}>{state.status === "sending" ? "Sending…" : "Send message"}</Button>
    </form>
  );
}
