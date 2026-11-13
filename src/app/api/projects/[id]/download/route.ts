import { NextResponse } from "next/server";
import { handle, HttpError } from "@/lib/http";
import { requireApiUser } from "@/lib/auth";
import { signedUrl } from "@/lib/storage";
import { cuesToSrt, cuesToVtt } from "@/lib/subtitles";
import type { SubtitleCue } from "@/lib/types";

export const GET = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { supabase } = await requireApiUser();
  const { data: project } = await supabase.from("projects").select("title, final_video_path, subtitles").eq("id", id).maybeSingle();
  if (!project) throw new HttpError(404, "Project not found");
  const kind = new URL(req.url).searchParams.get("kind") ?? "mp4";
  const safeName = project.title.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || "clipforge-video";

  if (kind === "vtt" || kind === "srt") {
    const cues = (project.subtitles ?? []) as SubtitleCue[];
    if (!cues.length) throw new HttpError(404, "No subtitles for this project");
    const body = kind === "vtt" ? cuesToVtt(cues) : cuesToSrt(cues);
    return new NextResponse(body, { headers: { "Content-Type": kind === "vtt" ? "text/vtt" : "application/x-subrip", "Content-Disposition": `attachment; filename="${safeName}.${kind}"` } });
  }
  if (!project.final_video_path) throw new HttpError(404, "The video isn't ready yet");
  const url = await signedUrl(supabase, project.final_video_path, 300, `${safeName}.mp4`);
  if (!url) throw new HttpError(500, "Could not create download link");
  return NextResponse.redirect(url);
});
