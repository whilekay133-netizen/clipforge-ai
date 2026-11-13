import { z } from "zod";
import { handle, json } from "@/lib/http";
import { requireApiUser } from "@/lib/auth";
import { signedUrls } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";

const FILTERS: Record<string, string[] | null> = {
  all: null,
  completed: ["completed"],
  processing: ["queued", "processing", "generating_script", "generating_scenes", "generating_voiceover", "assembling_video", "rendering"],
  failed: ["failed", "cancelled"],
  drafts: ["draft"],
};

export const GET = handle(async (req: Request) => {
  const { supabase } = await requireApiUser();
  const url = new URL(req.url);
  const filter = url.searchParams.get("filter") ?? "all";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const pageSize = Math.min(48, Math.max(1, Number(url.searchParams.get("pageSize") ?? 12)));
  let q = supabase.from("projects")
    .select("id, title, mode, category, status, created_at, duration_sec, aspect_ratio, resolution, thumbnail_path", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  const statuses = FILTERS[filter];
  if (statuses) q = q.in("status", statuses);
  const { data, count, error } = await q;
  if (error) throw new Error(error.message);
  const thumbs = await signedUrls(supabase, (data ?? []).map((p) => p.thumbnail_path).filter(Boolean) as string[]);
  return json({ items: (data ?? []).map((p) => ({ ...p, thumbnail_url: p.thumbnail_path ? thumbs[p.thumbnail_path] ?? null : null })), total: count ?? 0, page, pageSize });
});

const draftSchema = z.object({ title: z.string().trim().max(120).optional(), prompt: z.string().max(4000).default(""), mode: z.enum(["faceless", "text_to_video", "social", "storytelling"]).default("faceless"), settings: z.record(z.unknown()).default({}) });

/** Save a draft (does not start generation or reserve credits). */
export const POST = handle(async (req: Request) => {
  const { profile } = await requireApiUser();
  const body = draftSchema.parse(await req.json());
  const { data, error } = await createAdminClient().from("projects")
    .insert({ user_id: profile.id, title: body.title || "Untitled draft", prompt: body.prompt, mode: body.mode, settings: body.settings, status: "draft" })
    .select("id").single();
  if (error) throw new Error(error.message);
  return json({ id: data.id }, 201);
});
