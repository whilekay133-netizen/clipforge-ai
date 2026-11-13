"use server";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminPage } from "@/lib/auth";
import { grantCredits } from "@/lib/credits";
import { inngest } from "@/inngest/client";
import { notify } from "@/lib/notifications";

async function audit(adminClient: Awaited<ReturnType<typeof requireAdminPage>>["admin"], adminId: string, action: string, affected: string | null, details: object) {
  await adminClient.from("admin_audit_logs").insert({ admin_id: adminId, action, affected_user_id: affected, details });
}

export async function setAccountStatus(formData: FormData) {
  const { profile, admin } = await requireAdminPage();
  const { userId, status } = z.object({ userId: z.string().uuid(), status: z.enum(["active", "suspended"]) }).parse(Object.fromEntries(formData));
  if (userId === profile.id) throw new Error("You can't change your own status");
  await admin.from("profiles").update({ account_status: status }).eq("id", userId);
  await audit(admin, profile.id, status === "suspended" ? "suspend_user" : "restore_user", userId, {});
  revalidatePath("/admin");
}

export async function adjustCredits(formData: FormData) {
  const { profile, admin } = await requireAdminPage();
  const { userId, amount, reason } = z.object({ userId: z.string().uuid(), amount: z.coerce.number().int().refine((n) => n !== 0 && Math.abs(n) <= 100000), reason: z.string().trim().min(3).max(200) }).parse(Object.fromEntries(formData));
  const reference = `admin:${crypto.randomUUID()}`;
  await grantCredits(admin, userId, amount, "admin_adjustment", reference, `Admin adjustment: ${reason}`);
  await audit(admin, profile.id, "adjust_credits", userId, { amount, reason, reference });
  if (amount > 0) await notify(admin, userId, { title: "Credits added", message: `${amount} credits were added to your wallet.`, type: "success", link: "/dashboard/billing" });
  revalidatePath("/admin");
}

export async function retryGeneration(formData: FormData) {
  const { profile, admin } = await requireAdminPage();
  const { projectId } = z.object({ projectId: z.string().uuid() }).parse(Object.fromEntries(formData));
  const { data: project } = await admin.from("projects").select("id, user_id, status").eq("id", projectId).single();
  if (!project || !["failed", "cancelled"].includes(project.status)) throw new Error("Project is not retryable");
  const { data: last } = await admin.from("generations").select("estimated_credits, estimated_cost_usd, attempt").eq("project_id", projectId).order("created_at", { ascending: false }).limit(1).single();
  // Admin retries are free for the user: reserve 0 by granting the estimate first, then reserving it.
  const { data: gen } = await admin.from("generations").insert({
    project_id: projectId, user_id: project.user_id, idempotency_key: `admin-retry:${crypto.randomUUID()}`, status: "queued", stage: "queued",
    estimated_credits: last?.estimated_credits ?? 0, estimated_cost_usd: last?.estimated_cost_usd ?? 0, attempt: (last?.attempt ?? 1) + 1,
  }).select("id").single();
  if (!gen) throw new Error("Could not create generation");
  if ((last?.estimated_credits ?? 0) > 0) {
    await grantCredits(admin, project.user_id, last!.estimated_credits, "grant", `admin-retry-grant:${gen.id}`, "Courtesy credits for admin retry");
    await admin.rpc("reserve_credits", { p_user: project.user_id, p_amount: last!.estimated_credits, p_reference: `gen:${gen.id}`, p_description: "Reserved for admin retry" });
  }
  await admin.from("scenes").update({ status: "pending", error: null }).eq("project_id", projectId).eq("status", "failed");
  await admin.from("projects").update({ status: "queued", status_message: "Retry queued by support" }).eq("id", projectId);
  await inngest.send({ id: `gen-${gen.id}`, name: "video/generate.requested", data: { projectId, generationId: gen.id, userId: project.user_id } });
  await audit(admin, profile.id, "retry_generation", project.user_id, { projectId, generationId: gen.id });
  revalidatePath("/admin");
}

export async function updatePlan(formData: FormData) {
  const { profile, admin } = await requireAdminPage();
  const input = z.object({
    planId: z.string().uuid(),
    price_minor: z.coerce.number().int().min(0),
    monthly_credits: z.coerce.number().int().min(0),
    max_duration_sec: z.coerce.number().int().min(5).max(600),
    is_active: z.string().optional(),
  }).parse(Object.fromEntries(formData));
  const { data: plan } = await admin.from("plans").select("limits").eq("id", input.planId).single();
  await admin.from("plans").update({
    price_minor: input.price_minor, monthly_credits: input.monthly_credits, is_active: input.is_active === "on",
    limits: { ...(plan?.limits ?? {}), max_duration_sec: input.max_duration_sec },
  }).eq("id", input.planId);
  await audit(admin, profile.id, "update_plan", null, input);
  revalidatePath("/admin");
}

export async function updateCreditRates(formData: FormData) {
  const { profile, admin } = await requireAdminPage();
  const rates = z.object({
    script: z.coerce.number().int().min(0), video_clip_5s: z.coerce.number().int().min(1), voiceover_per_15s: z.coerce.number().int().min(0),
    render: z.coerce.number().int().min(0), hd_multiplier: z.coerce.number().min(0.5).max(5),
  }).parse(Object.fromEntries(formData));
  await admin.from("app_settings").upsert({ key: "credit_rates", value: rates, updated_at: new Date().toISOString() });
  await audit(admin, profile.id, "update_credit_rates", null, rates);
  revalidatePath("/admin");
}
