import crypto from "crypto";
import { handle, json, HttpError } from "@/lib/http";
import { requireApiUser } from "@/lib/auth";
import { createGenerationSchema } from "@/lib/validation";
import { estimateCredits, estimateProviderCostUsd } from "@/lib/pricing";
import { getCreditRates, reserveCredits, settleCredits } from "@/lib/credits";
import { createAdminClient } from "@/lib/supabase/admin";
import { inngest } from "@/inngest/client";
import { ACTIVE_STATUSES } from "@/lib/catalog";
import { notify } from "@/lib/notifications";
import type { Plan } from "@/lib/types";

const BLOCKLIST = /\b(child\s*(porn|sexual)|csam|nude\s*(minor|child)|deepfake\s+of|revenge\s*porn)\b/i;

export const POST = handle(async (req: Request) => {
  const { profile } = await requireApiUser();
  const input = createGenerationSchema.parse(await req.json());
  const admin = createAdminClient();

  if (BLOCKLIST.test(input.prompt) || BLOCKLIST.test(input.enhancedPrompt ?? "")) {
    throw new HttpError(400, "This request appears to violate our content policy.", "CONTENT_POLICY");
  }

  // Plan limits
  const { data: sub } = await admin.from("subscriptions").select("plans(*)").eq("user_id", profile.id).eq("status", "active").maybeSingle();
  const plan = (sub?.plans as unknown as Plan | null) ?? null;
  const maxDuration = plan?.limits?.max_duration_sec ?? 30;
  if (input.settings.durationSec > maxDuration) {
    throw new HttpError(403, `Your ${plan?.name ?? "current"} plan supports videos up to ${maxDuration} seconds. Upgrade for longer videos.`, "PLAN_LIMIT");
  }

  // Rate limits: concurrency and hourly volume
  const since = new Date(Date.now() - 3600_000).toISOString();
  const [{ count: active }, { count: recent }] = await Promise.all([
    admin.from("generations").select("id", { count: "exact", head: true }).eq("user_id", profile.id).in("status", ACTIVE_STATUSES),
    admin.from("generations").select("id", { count: "exact", head: true }).eq("user_id", profile.id).gte("created_at", since),
  ]);
  if ((active ?? 0) >= 3) throw new HttpError(429, "You already have 3 videos in progress. Wait for one to finish.", "TOO_MANY_ACTIVE");
  if ((recent ?? 0) >= 20) throw new HttpError(429, "Hourly generation limit reached. Try again later.", "RATE_LIMIT");

  // Server-side estimate (never trust the client)
  const rates = await getCreditRates(admin);
  const estimateInput = { mode: input.mode, durationSec: input.settings.durationSec, voiceEnabled: input.settings.voice.enabled };
  const estimate = estimateCredits(estimateInput, rates);

  // Idempotency: the client sends a key per submit click; same key => same job.
  const idempotencyKey = req.headers.get("idempotency-key")?.slice(0, 100) || crypto.randomUUID();
  const { data: existing } = await admin.from("generations").select("id, project_id").eq("idempotency_key", `${profile.id}:${idempotencyKey}`).maybeSingle();
  if (existing) return json({ projectId: existing.project_id, generationId: existing.id, duplicate: true });

  // Create or reuse draft project
  const projectFields = {
    user_id: profile.id,
    title: input.title || "Untitled video",
    mode: input.mode,
    category: input.category ?? null,
    prompt: input.prompt,
    enhanced_prompt: input.enhancedPrompt ?? null,
    settings: input.settings,
    status: "queued" as const,
    status_message: "Waiting for a worker",
    aspect_ratio: input.settings.aspectRatio,
    script: null,
    subtitles: null,
    voiceover_path: null,
  };
  let projectId = input.projectId;
  if (projectId) {
    const { data: own } = await admin.from("projects").select("id, status").eq("id", projectId).eq("user_id", profile.id).maybeSingle();
    if (!own) throw new HttpError(404, "Project not found.");
    if (own.status !== "draft") throw new HttpError(409, "Only drafts can be submitted. Use retry for failed projects.");
    await admin.from("scenes").delete().eq("project_id", projectId);
    await admin.from("projects").update(projectFields).eq("id", projectId);
  } else {
    const { data: created, error } = await admin.from("projects").insert(projectFields).select("id").single();
    if (error || !created) throw new Error(`Could not create project: ${error?.message}`);
    projectId = created.id;
  }

  const { data: gen, error: genErr } = await admin.from("generations").insert({
    project_id: projectId,
    user_id: profile.id,
    idempotency_key: `${profile.id}:${idempotencyKey}`,
    status: "queued",
    stage: "queued",
    estimated_credits: estimate.total,
    estimated_cost_usd: estimateProviderCostUsd(estimateInput),
  }).select("id").single();
  if (genErr || !gen) throw new Error(`Could not create generation: ${genErr?.message}`);

  try {
    await reserveCredits(admin, profile.id, estimate.total, `gen:${gen.id}`, `Reserved for video ${projectId}`);
  } catch (err) {
    await admin.from("generations").update({ status: "failed", error: "insufficient credits" }).eq("id", gen.id);
    await admin.from("projects").update({ status: "draft", status_message: null }).eq("id", projectId);
    throw err;
  }

  try {
    await inngest.send({ id: `gen-${gen.id}`, name: "video/generate.requested", data: { projectId: projectId!, generationId: gen.id, userId: profile.id } });
  } catch (err) {
    // Could not enqueue: release the reservation immediately.
    await settleCredits(admin, profile.id, estimate.total, 0, `gen:${gen.id}`, "Refund: could not start job");
    await admin.from("generations").update({ status: "failed", error: "enqueue failed" }).eq("id", gen.id);
    await admin.from("projects").update({ status: "failed", status_message: "We couldn't start this job. Your credits were refunded." }).eq("id", projectId);
    throw err;
  }

  await notify(admin, profile.id, { title: "Video generation started", message: `Reserved ${estimate.total} credits. We'll notify you when it's ready.`, link: `/dashboard/projects/${projectId}` });
  return json({ projectId, generationId: gen.id, estimatedCredits: estimate.total }, 202);
});
