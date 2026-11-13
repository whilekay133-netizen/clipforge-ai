import Link from "next/link";
import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { integrationStatus } from "@/lib/env";
import { DEFAULT_RATES } from "@/lib/pricing";
import { STATUS_LABEL, statusTone } from "@/lib/catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatDateTime, formatMoney } from "@/lib/utils";
import { adjustCredits, retryGeneration, setAccountStatus, updateCreditRates, updatePlan } from "./actions";
import type { Plan, ProjectStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Admin" };

const TABS = ["overview", "users", "generations", "plans", "audit"] as const;

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; status?: string }> }) {
  const sp = await searchParams;
  const tab = (TABS as readonly string[]).includes(sp.tab ?? "") ? sp.tab! : "overview";
  const { admin } = await requireAdminPage();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Administration</h1>
      <nav className="flex flex-wrap gap-2">
        {TABS.map((t) => <Link key={t} href={`/admin?tab=${t}`} className={cn("rounded-full border px-3.5 py-1.5 text-sm capitalize", tab === t ? "border-brand bg-brand/15" : "border-border text-muted hover:text-fg")}>{t}</Link>)}
      </nav>
      {tab === "overview" && <Overview admin={admin} />}
      {tab === "users" && <Users admin={admin} q={sp.q} />}
      {tab === "generations" && <Generations admin={admin} status={sp.status} />}
      {tab === "plans" && <Plans admin={admin} />}
      {tab === "audit" && <Audit admin={admin} />}
    </div>
  );
}

type Admin = Awaited<ReturnType<typeof requireAdminPage>>["admin"];

async function Overview({ admin }: { admin: Admin }) {
  const since = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();
  const [users, active, gens, ok, failed, debits, revenue, subs, cost] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("projects").select("user_id").gte("created_at", since),
    admin.from("generations").select("id", { count: "exact", head: true }),
    admin.from("generations").select("id", { count: "exact", head: true }).eq("status", "completed"),
    admin.from("generations").select("id", { count: "exact", head: true }).eq("status", "failed"),
    admin.from("credit_transactions").select("amount").eq("type", "debit"),
    admin.from("payments").select("amount_minor, currency").eq("status", "success"),
    admin.from("subscriptions").select("id, plans!inner(price_minor)", { count: "exact", head: true }).eq("status", "active").gt("plans.price_minor", 0),
    admin.from("generations").select("estimated_cost_usd, video_model").eq("status", "completed"),
  ]);
  const activeUsers = new Set((active.data ?? []).map((p) => p.user_id)).size;
  const creditsUsed = (debits.data ?? []).reduce((s, d) => s + Math.abs(d.amount), 0);
  const revenueNgn = (revenue.data ?? []).filter((p) => p.currency === "NGN").reduce((s, p) => s + p.amount_minor, 0);
  const aiCost = (cost.data ?? []).reduce((s, g) => s + Number(g.estimated_cost_usd), 0);
  const byModel = Object.entries((cost.data ?? []).reduce<Record<string, number>>((acc, g) => { const k = g.video_model ?? "unknown"; acc[k] = (acc[k] ?? 0) + 1; return acc; }, {}));
  const integrations = integrationStatus();

  const stats = [
    ["Registered users", (users.count ?? 0).toLocaleString()], ["Active users (30d)", activeUsers.toLocaleString()],
    ["Generations", (gens.count ?? 0).toLocaleString()], ["Successful / failed", `${ok.count ?? 0} / ${failed.count ?? 0}`],
    ["Credits consumed", creditsUsed.toLocaleString()], ["Revenue (NGN)", formatMoney(revenueNgn, "NGN")],
    ["Paid subscriptions", (subs.count ?? 0).toLocaleString()], ["Est. AI cost (USD)", `$${aiCost.toFixed(2)}`],
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(([k, v]) => <Card key={k}><CardContent><p className="text-xs text-muted">{k}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{v}</p></CardContent></Card>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardContent>
          <h2 className="mb-3 font-semibold">Integrations</h2>
          <ul className="space-y-2 text-sm">{Object.entries(integrations).map(([k, v]) => <li key={k} className="flex justify-between capitalize"><span>{k}</span><Badge tone={v ? "success" : "danger"}>{v ? "configured" : "missing keys"}</Badge></li>)}</ul>
        </CardContent></Card>
        <Card><CardContent>
          <h2 className="mb-3 font-semibold">Provider usage (completed jobs)</h2>
          {byModel.length ? <ul className="space-y-2 text-sm">{byModel.map(([m, n]) => <li key={m} className="flex justify-between gap-3"><span className="truncate font-mono text-xs">{m}</span><span>{n}</span></li>)}</ul> : <p className="text-sm text-muted">No completed jobs yet.</p>}
        </CardContent></Card>
      </div>
    </div>
  );
}

async function Users({ admin, q }: { admin: Admin; q?: string }) {
  let query = admin.from("profiles").select("*, credit_wallets(available, reserved)").order("created_at", { ascending: false }).limit(50);
  if (q) query = query.or(`email.ilike.%${q.replace(/[%,()]/g, "")}%,full_name.ilike.%${q.replace(/[%,()]/g, "")}%`);
  const { data } = await query;
  return (
    <div className="space-y-4">
      <form className="flex max-w-md gap-2"><input type="hidden" name="tab" value="users" /><Input name="q" defaultValue={q} placeholder="Search name or email" /><Button variant="secondary">Search</Button></form>
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted"><tr><th className="px-4 py-2">User</th><th className="px-2 py-2">Role</th><th className="px-2 py-2">Status</th><th className="px-2 py-2">Credits</th><th className="px-2 py-2">Joined</th><th className="px-4 py-2">Actions</th></tr></thead>
          <tbody>
            {(data ?? []).map((u) => {
              const w = (Array.isArray(u.credit_wallets) ? u.credit_wallets[0] : u.credit_wallets) as { available: number; reserved: number } | null;
              return (
                <tr key={u.id} className="border-t border-border/60 align-top">
                  <td className="px-4 py-3"><div className="font-medium">{u.full_name || "—"}</div><div className="text-xs text-muted">{u.email}</div></td>
                  <td className="px-2 py-3">{u.role}</td>
                  <td className="px-2 py-3"><Badge tone={u.account_status === "active" ? "success" : "danger"}>{u.account_status}</Badge></td>
                  <td className="px-2 py-3 tabular-nums">{w?.available ?? 0}{w?.reserved ? <span className="text-xs text-muted"> (+{w.reserved} reserved)</span> : null}</td>
                  <td className="px-2 py-3 text-muted">{formatDateTime(u.created_at)}</td>
                  <td className="space-y-2 px-4 py-3">
                    <form action={setAccountStatus}><input type="hidden" name="userId" value={u.id} /><input type="hidden" name="status" value={u.account_status === "active" ? "suspended" : "active"} />
                      <Button size="sm" variant={u.account_status === "active" ? "danger" : "secondary"}>{u.account_status === "active" ? "Suspend" : "Restore"}</Button></form>
                    <form action={adjustCredits} className="flex gap-1"><input type="hidden" name="userId" value={u.id} />
                      <Input name="amount" type="number" placeholder="±credits" className="h-8 w-24" required /><Input name="reason" placeholder="Reason" className="h-8 w-36" required minLength={3} /><Button size="sm" variant="secondary">Apply</Button></form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

async function Generations({ admin, status }: { admin: Admin; status?: string }) {
  let query = admin.from("generations").select("*, projects(title), profiles(email)").order("created_at", { ascending: false }).limit(50);
  if (status) query = query.eq("status", status);
  const { data } = await query;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-sm">
        {["", "failed", "completed", "generating_scenes", "rendering", "cancelled"].map((s) => <Link key={s} href={`/admin?tab=generations${s ? `&status=${s}` : ""}`} className={cn("rounded-full border px-3 py-1", (status ?? "") === s ? "border-brand bg-brand/15" : "border-border text-muted")}>{s ? STATUS_LABEL[s as ProjectStatus] : "All"}</Link>)}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted"><tr><th className="px-4 py-2">Job</th><th className="px-2 py-2">User</th><th className="px-2 py-2">Status</th><th className="px-2 py-2">Models</th><th className="px-2 py-2">Credits</th><th className="px-2 py-2">Error</th><th className="px-4 py-2" /></tr></thead>
          <tbody>
            {(data ?? []).map((g) => (
              <tr key={g.id} className="border-t border-border/60 align-top">
                <td className="px-4 py-3"><div className="font-medium">{(g.projects as { title: string } | null)?.title}</div><div className="font-mono text-[11px] text-muted">{g.id.slice(0, 8)} · attempt {g.attempt} · {formatDateTime(g.created_at)}</div></td>
                <td className="px-2 py-3 text-muted">{(g.profiles as { email: string } | null)?.email}</td>
                <td className="px-2 py-3"><Badge tone={statusTone(g.status)}>{STATUS_LABEL[g.status as ProjectStatus]}</Badge></td>
                <td className="px-2 py-3 font-mono text-[11px] text-muted">{[g.text_model, g.video_model, g.voice_model, g.render_model].filter(Boolean).join(" · ") || "—"}{g.render_request_id && <div>render req {g.render_request_id.slice(0, 10)}…</div>}</td>
                <td className="px-2 py-3 tabular-nums">{g.actual_credits ?? g.estimated_credits}</td>
                <td className="max-w-xs px-2 py-3 text-xs text-danger">{g.error}</td>
                <td className="px-4 py-3">{g.status === "failed" && <form action={retryGeneration}><input type="hidden" name="projectId" value={g.project_id} /><Button size="sm" variant="secondary">Retry</Button></form>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

async function Plans({ admin }: { admin: Admin }) {
  const [{ data: plans }, { data: rates }] = await Promise.all([
    admin.from("plans").select("*").order("sort_order"),
    admin.from("app_settings").select("value").eq("key", "credit_rates").maybeSingle(),
  ]);
  const r = { ...DEFAULT_RATES, ...(rates?.value ?? {}) };
  return (
    <div className="space-y-6">
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted"><tr><th className="px-4 py-2">Plan</th><th className="px-2 py-2">Price (kobo)</th><th className="px-2 py-2">Credits</th><th className="px-2 py-2">Max duration (s)</th><th className="px-2 py-2">Active</th><th className="px-4 py-2" /></tr></thead>
          <tbody>
            {((plans ?? []) as Plan[]).map((p) => (
              <tr key={p.id} className="border-t border-border/60">
                <td className="px-4 py-3"><div className="font-medium">{p.name}</div><div className="text-xs text-muted">{p.billing_interval} · {formatMoney(p.price_minor, p.currency)}</div></td>
                <td colSpan={5} className="px-2 py-3">
                  <form action={updatePlan} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="planId" value={p.id} />
                    <Input name="price_minor" type="number" defaultValue={p.price_minor} className="h-8 w-32" />
                    <Input name="monthly_credits" type="number" defaultValue={p.monthly_credits} className="h-8 w-24" />
                    <Input name="max_duration_sec" type="number" defaultValue={p.limits?.max_duration_sec ?? 30} className="h-8 w-24" />
                    <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="is_active" defaultChecked={p.is_active} /> active</label>
                    <Button size="sm" variant="secondary">Save</Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Card><CardContent>
        <h2 className="font-semibold">Credit rates</h2>
        <p className="mt-1 text-sm text-muted">Server-side pricing used for every estimate. Set from measured provider costs.</p>
        <form action={updateCreditRates} className="mt-4 flex flex-wrap items-end gap-3">
          {(Object.keys(DEFAULT_RATES) as (keyof typeof DEFAULT_RATES)[]).map((k) => (
            <label key={k} className="text-xs text-muted">{k}<Input name={k} type="number" step={k === "hd_multiplier" ? "0.1" : "1"} defaultValue={r[k]} className="mt-1 h-9 w-32" /></label>
          ))}
          <Button>Save rates</Button>
        </form>
      </CardContent></Card>
    </div>
  );
}

async function Audit({ admin }: { admin: Admin }) {
  const { data } = await admin.from("admin_audit_logs").select("*, admin:profiles!admin_audit_logs_admin_id_fkey(email), affected:profiles!admin_audit_logs_affected_user_id_fkey(email)").order("created_at", { ascending: false }).limit(100);
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted"><tr><th className="px-4 py-2">When</th><th className="px-2 py-2">Admin</th><th className="px-2 py-2">Action</th><th className="px-2 py-2">User</th><th className="px-4 py-2">Details</th></tr></thead>
        <tbody>
          {(data ?? []).map((l) => (
            <tr key={l.id} className="border-t border-border/60">
              <td className="px-4 py-2.5 text-muted">{formatDateTime(l.created_at)}</td>
              <td className="px-2 py-2.5">{(l.admin as { email: string } | null)?.email}</td>
              <td className="px-2 py-2.5 font-mono text-xs">{l.action}</td>
              <td className="px-2 py-2.5 text-muted">{(l.affected as { email: string } | null)?.email ?? "—"}</td>
              <td className="px-4 py-2.5 font-mono text-[11px] text-muted">{JSON.stringify(l.details)}</td>
            </tr>
          ))}
          {!data?.length && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted">No admin actions yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
