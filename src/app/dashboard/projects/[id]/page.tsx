import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSessionProfile } from "@/lib/auth";
import { signedUrl } from "@/lib/storage";
import { ProjectView } from "@/components/dashboard/project-view";
import type { Project, Scene } from "@/lib/types";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await getSessionProfile();
  const { data: project } = await supabase.from("projects").select("*").eq("id", id).maybeSingle<Project>(); // RLS: owner only
  if (!project) notFound();
  const [{ data: scenes }, { data: generation }, videoUrl, thumbnailUrl] = await Promise.all([
    supabase.from("scenes").select("*").eq("project_id", id).order("scene_number"),
    supabase.from("generations").select("estimated_credits, actual_credits, error").eq("project_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    signedUrl(supabase, project.final_video_path, 3600),
    signedUrl(supabase, project.thumbnail_path, 3600),
  ]);
  return (
    <>
      <Link href="/dashboard/projects" className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft className="h-4 w-4" /> Projects</Link>
      <ProjectView project={project} scenes={(scenes ?? []) as Scene[]} videoUrl={videoUrl} thumbnailUrl={thumbnailUrl} generation={generation} />
    </>
  );
}
