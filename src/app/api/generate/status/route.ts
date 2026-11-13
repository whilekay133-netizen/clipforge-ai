import { handle, json, HttpError } from "@/lib/http";
import { requireApiUser } from "@/lib/auth";

export const GET = handle(async (req: Request) => {
  const { supabase } = await requireApiUser();
  const projectId = new URL(req.url).searchParams.get("projectId");
  if (!projectId) throw new HttpError(400, "projectId is required");
  // RLS guarantees users only see their own rows.
  const { data: project } = await supabase.from("projects").select("id, status, status_message, updated_at, final_video_path").eq("id", projectId).maybeSingle();
  if (!project) throw new HttpError(404, "Project not found");
  const [{ data: scenes }, { data: generation }] = await Promise.all([
    supabase.from("scenes").select("scene_number, status").eq("project_id", projectId).order("scene_number"),
    supabase.from("generations").select("id, status, stage, estimated_credits, actual_credits, error, created_at").eq("project_id", projectId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  return json({ project, scenes: scenes ?? [], generation });
});
