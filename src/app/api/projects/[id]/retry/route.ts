import crypto from "crypto";
import { handle, json, HttpError } from "@/lib/http";
import { requireApiUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { estimateCredits, estimateProviderCostUsd } from "@/lib/pricing";
import { getCreditRates, reserveCredits, settleCredits } from "@/lib/credits";
import { inngest } from "@/inngest/client";
import type { ProjectSettings } from "@/lib/types";

/** Retry a failed/cancelled project. Completed scenes and voiceover are reused; failed scenes are regenerated. */
export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { profile, supabase } = await requireApiUser();
  const { data: project } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  if (!project) throw new HttpError(404, "Project not found");
  if (!["failed", "cancelled"].includes(project.status)) throw new HttpError(409, "Only failed or cancelled projects can be retried.");

  const admin = createAdminClient();
  const settings = project.settings as ProjectSettings;
  const estimateInput = { mode: project.mode, durationSec: settings.durationSec, voiceEnabled: settings.voice.enabled };
  const estimate = estimateCredits(estimateInput, await getCreditRates(admin));
  const key = req.headers.get("idempotency-key")?.slice(0, 100) || crypto.randomUUID();

  const { data: prior } = await admin.from("generations").select("attempt").eq("project_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const { data: gen, error } = await admin.from("generations").insert({
    project_id: id, user_id: profile.id, idempotency_key: `${profile.id}:${key}`, status: "queued", stage: "queued",
    estimated_credits: estimate.total, estimated_cost_usd: estimateProviderCostUsd(estimateInput), attempt: (prior?.attempt ?? 1) + 1,
  }).select("id").single();
  if (error) {
    if (error.code === "23505") return json({ ok: true, duplicate: true });
    throw new Error(error.message);
  }
  await reserveCredits(admin, profile.id, estimate.total, `gen:${gen.id}`, `Reserved for retry of ${id}`).catch(async (e) => {
    await admin.from("generations").update({ status: "failed", error: "insufficient credits" }).eq("id", gen.id);
    throw e;
  });
  await admin.from("scenes").update({ status: "pending", error: null }).eq("project_id", id).eq("status", "failed");
  await admin.from("projects").update({ status: "queued", status_message: "Retry queued" }).eq("id", id);
  try {
    await inngest.send({ id: `gen-${gen.id}`, name: "video/generate.requested", data: { projectId: id, generationId: gen.id, userId: profile.id } });
  } catch (e) {
    await settleCredits(admin, profile.id, estimate.total, 0, `gen:${gen.id}`, "Refund: could not start retry");
    await admin.from("projects").update({ status: "failed", status_message: "Couldn't start the retry. Credits refunded." }).eq("id", id);
    throw e;
  }
  return json({ ok: true, generationId: gen.id }, 202);
});
