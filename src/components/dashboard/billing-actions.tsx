"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";

export function BuyButton({ planId, label, variant = "default", disabled }: { planId: string; label: string; variant?: "default" | "secondary"; disabled?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      <Button className="w-full" variant={variant} disabled={loading || disabled} onClick={async () => {
        setLoading(true);
        setError("");
        const res = await fetch("/api/payments/initialize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId }) });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) { setError(body.error ?? "Could not start checkout"); setLoading(false); return; }
        window.location.href = body.authorizationUrl;
      }}>{loading && <Loader2 className="h-4 w-4 animate-spin" />}{label}</Button>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}

/** After returning from Paystack: verify server-side (the redirect itself proves nothing). */
export function PaymentVerifier({ reference }: { reference: string }) {
  const router = useRouter();
  const [state, setState] = useState<"verifying" | "success" | "failed" | "pending">("verifying");
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    fetch("/api/payments/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference }) })
      .then((r) => r.json())
      .then((b) => {
        setState(b.status === "success" ? "success" : b.status === "pending" ? "pending" : "failed");
        if (b.status === "success") router.refresh();
      })
      .catch(() => setState("pending"));
  }, [reference, router]);
  if (state === "verifying") return <Alert tone="info">Confirming your payment…</Alert>;
  if (state === "success") return <Alert tone="success">Payment confirmed. Your credits have been added.</Alert>;
  if (state === "pending") return <Alert tone="warning">We&apos;re still waiting for confirmation from Paystack. Credits are added automatically once it arrives.</Alert>;
  return <Alert tone="danger">The payment wasn&apos;t completed. You have not been charged credits.</Alert>;
}
