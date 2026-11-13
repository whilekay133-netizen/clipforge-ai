import { handle, json, HttpError } from "@/lib/http";
import { requireApiUser } from "@/lib/auth";
import { updateProjectSchema } from "@/lib/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET, signedUrl } from "@/lib/storage";
import { ACTIVE_STATUSES } from "@/lib/catalog";

type Ctx = { params: Promise<{ id: string }> };

async function ownProject(id: string) {
  const ctx = await requireApiUser();
  const { data: project } = await ctx.supabase.from("projects").select("*").eq("id", id).maybeSingle(); // RLS: own rows only
  if (!project) throw new HttpError(404, "Project not found");
  return { ...ctx, project };
}

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const { project, supabase } = await ownProject(id);
  const { data: scenes } = await supabase.from("scenes").select("*").eq("project_id", id).order("scene_number");
  return json({
    project,
    scenes,
    videoUrl: await signedUrl(supabase, project.final_video_path),
    thumbnailUrl: await signedUrl(supabase, project.thumbnail_path),
  });
});

export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  const { project } = await ownProject(id);
  const body = updateProjectSchema.parse(await req.json());
  if (body.subtitles && !project.subtitles) throw new HttpError(400, "This project has no subtitles.");
  const { error } = await createAdminClient().from("projects").update(body).eq("id", project.id).eq("user_id", project.user_id);
  if (error) throw new Error(error.message);
  return json({ ok: true });
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const { project } = await ownProject(id);
  if (ACTIVE_STATUSES.includes(project.status)) throw new HttpError(409, "Cancel the generation before deleting this project.");
  const admin = createAdminClient();
  const { data: assets } = await admin.from("assets").select("storage_path").eq("project_id", project.id).eq("user_id", project.user_id);
  const pathsToRemove = (assets ?? []).map((a) => a.storage_path);
  if (pathsToRemove.length) {
    const { error } = await admin.storage.from(BUCKET).remove(pathsToRemove);
    if (error) throw new Error(`Could not delete media: ${error.message}`);
  }
  await admin.from("projects").delete().eq("id", project.id).eq("user_id", project.user_id); // cascades scenes, assets, generations
  return json({ ok: true });
});
