import { z } from "zod";
import { handle, json, HttpError } from "@/lib/http";
import { requireApiUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { inngest } from "@/inngest/client";
import { closeGeneration } from "@/inngest/pipeline";
import { providers } from "@/lib/providers";
import { ACTIVE_STATUSES } from "@/lib/catalog";

export const POST = handle(async (req: Request) => {
  const { profile } = await requireApiUser();
  const { projectId } = z.object({ projectId: z.string().uuid() }).parse(await req.json());
  const admin = createAdminClient();
  const { data: gen } = await admin.from("generations").select("id, status").eq("project_id", projectId).eq("user_id", profile.id)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!gen || !ACTIVE_STATUSES.includes(gen.status)) throw new HttpError(409, "Nothing to cancel.");

  await inngest.send({ name: "video/generate.cancelled", data: { generationId: gen.id } });

  // Best-effort cancel of provider jobs still running
  const { data: submitted } = await admin.from("scenes").select("provider_request_id").eq("project_id", projectId).eq("status", "submitted");
  if (process.env.FAL_KEY) {
    const video = providers.video();
    await Promise.all((submitted ?? []).filter((s) => s.provider_request_id).map((s) => video.cancel({ requestId: s.provider_request_id!, model: video.model })));
  }
  await closeGeneration(admin, gen.id, "cancelled", "cancelled by user");
  return json({ ok: true });
});
