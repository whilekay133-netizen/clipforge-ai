import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { settleCredits } from "@/lib/credits";
import { notify, LOW_CREDIT_THRESHOLD } from "@/lib/notifications";
import type { ProjectStatus } from "@/lib/types";

export async function setStage(admin: SupabaseClient, projectId: string, generationId: string, status: ProjectStatus, message?: string) {
  await Promise.all([
    admin.from("projects").update({ status, status_message: message ?? null }).eq("id", projectId),
    admin.from("generations").update({ status, stage: status }).eq("id", generationId),
  ]);
}

export function sanitizeError(err: unknown) {
  const raw = err instanceof Error ? err.message : String(err);
  return raw.replace(/(key|token|secret|authorization)[=:]\s*\S+/gi, "$1=[redacted]").slice(0, 500);
}

/** Mark a generation failed/cancelled and refund its reservation in full (published policy: you only pay for completed videos). */
export async function closeGeneration(admin: SupabaseClient, generationId: string, outcome: "failed" | "cancelled", reason: string) {
  const { data: gen } = await admin.from("generations").select("*").eq("id", generationId).single();
  if (!gen || ["completed", "failed", "cancelled"].includes(gen.status)) return;

  await settleCredits(admin, gen.user_id, gen.estimated_credits, 0, `gen:${gen.id}`, outcome === "failed" ? "Refund: generation failed" : "Refund: generation cancelled");
  await admin.from("generations").update({ status: outcome, error: outcome === "failed" ? reason : null, actual_credits: 0, completed_at: new Date().toISOString() }).eq("id", gen.id);
  await admin.from("projects").update({
    status: outcome,
    status_message: outcome === "failed" ? "Generation failed. Your credits were refunded. You can retry — completed scenes are reused." : "Cancelled. Your credits were refunded.",
  }).eq("id", gen.project_id);
  await admin.from("scenes").update({ status: "failed", error: outcome }).eq("project_id", gen.project_id).eq("status", "submitted");

  if (outcome === "failed") {
    await notify(admin, gen.user_id, { title: "Video generation failed", message: "Something went wrong while generating your video. Your credits were refunded.", type: "error", link: `/dashboard/projects/${gen.project_id}` });
  }
}

export async function completeGeneration(admin: SupabaseClient, generationId: string) {
  const { data: gen } = await admin.from("generations").select("*").eq("id", generationId).single();
  if (!gen || gen.status === "completed") return;
  await settleCredits(admin, gen.user_id, gen.estimated_credits, gen.estimated_credits, `gen:${gen.id}`, "Video generated");
  await admin.from("generations").update({ status: "completed", stage: "completed", actual_credits: gen.estimated_credits, completed_at: new Date().toISOString() }).eq("id", gen.id);
  await admin.from("projects").update({ status: "completed", status_message: null }).eq("id", gen.project_id);
  await notify(admin, gen.user_id, { title: "Your video is ready", message: "Preview it, edit subtitles or download the MP4.", type: "success", link: `/dashboard/projects/${gen.project_id}` });

  const { data: wallet } = await admin.from("credit_wallets").select("available").eq("user_id", gen.user_id).single();
  if (wallet && wallet.available < LOW_CREDIT_THRESHOLD) {
    await notify(admin, gen.user_id, { title: "Credits running low", message: `You have ${wallet.available} credits left.`, type: "warning", link: "/dashboard/billing" });
  }
}
