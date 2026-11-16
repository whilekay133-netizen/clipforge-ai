import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { requireEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { JobPoll, QueuedJob, RenderClip, VideoGenerationProvider, VideoRenderingProvider } from "./types";

/* -------------------------------------------------------------------------- */
/* Pexels stock footage — the free "video generation" backend                  */
/* -------------------------------------------------------------------------- */

export interface PexelsFile { file_type: string; width: number | null; height: number | null; link: string }
export interface PexelsVideo { id: number; duration: number; video_files: PexelsFile[] }

const ORIENTATION: Record<string, "landscape" | "portrait" | "square"> = { "16:9": "landscape", "9:16": "portrait", "1:1": "square" };

/** Pick the mp4 closest to HD (short side ~720 px) so files stay small but sharp. */
export function pickVideoFile(video: PexelsVideo): PexelsFile | null {
  const files = video.video_files.filter((f) => f.file_type === "video/mp4" && f.width && f.height && f.link);
  if (!files.length) return null;
  const short = (f: PexelsFile) => Math.min(f.width!, f.height!);
  return files.reduce((best, f) => (Math.abs(short(f) - 720) < Math.abs(short(best) - 720) ? f : best));
}

/** Prefer clips at least as long as the scene; fall back to the longest available. */
export function chooseVideo(videos: PexelsVideo[], neededSec: number, random: () => number = Math.random): { video: PexelsVideo; file: PexelsFile } | null {
  const usable = videos.map((video) => ({ video, file: pickVideoFile(video) })).filter((v): v is { video: PexelsVideo; file: PexelsFile } => v.file !== null);
  if (!usable.length) return null;
  const long = usable.filter((v) => v.video.duration >= neededSec);
  const pool = (long.length ? long : [...usable].sort((a, b) => b.video.duration - a.video.duration)).slice(0, 6);
  return pool[Math.floor(random() * pool.length)];
}

const STOP = new Set(["a", "an", "the", "of", "and", "in", "on", "at", "to", "with", "for", "from", "by", "as", "is", "are", "its", "their", "style", "cinematic", "shot", "camera", "slow", "slowly", "pan", "zoom", "close", "up", "wide", "angle", "lighting", "light", "scene", "view", "background", "high", "quality", "frame", "over", "into", "while", "through", "behind"]);

/** Offline fallback when the model call fails: a few content words from the prompt. */
export function keywordQuery(prompt: string, max = 4): string {
  const words = prompt.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
  return [...new Set(words)].slice(0, max).join(" ");
}

export class StockVideoProvider implements VideoGenerationProvider {
  readonly name = "pexels";
  readonly model = "pexels-stock";

  private async toQuery(prompt: string): Promise<string> {
    try {
      const client = new Anthropic({ apiKey: requireEnv("ANTHROPIC_API_KEY") });
      const res = await client.messages.create({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
        max_tokens: 40,
        system: "You write stock-footage search queries. Reply with only 2 to 4 plain English keywords that would find a matching real-world video clip on a stock site. No punctuation, no quotes, no people's names, no brand names.",
        messages: [{ role: "user", content: prompt.slice(0, 800) }],
      });
      const text = res.content.map((b) => ("text" in b ? b.text : "")).join("").replace(/[^a-zA-Z\s]/g, " ").replace(/\s+/g, " ").trim();
      if (text) return text.split(" ").slice(0, 5).join(" ");
    } catch (err) {
      console.error("[stock] query condensing failed, using keywords:", err instanceof Error ? err.message : err);
    }
    return keywordQuery(prompt) || "nature";
  }

  private async search(query: string, aspectRatio: string): Promise<PexelsVideo[]> {
    const params = new URLSearchParams({ query, per_page: "20", orientation: ORIENTATION[aspectRatio] ?? "landscape", size: "medium" });
    const res = await fetch(`https://api.pexels.com/videos/search?${params}`, { headers: { Authorization: requireEnv("PEXELS_API_KEY") } });
    if (res.status === 401 || res.status === 403) throw new Error("Pexels rejected the API key. Check PEXELS_API_KEY.");
    if (res.status === 429) throw new Error("Pexels rate limit reached. Try again shortly.");
    if (!res.ok) throw new Error(`Pexels search failed (${res.status})`);
    return ((await res.json()) as { videos?: PexelsVideo[] }).videos ?? [];
  }

  async submitTextToVideo(input: { prompt: string; durationSec: 5 | 10; aspectRatio: string }): Promise<QueuedJob> {
    const query = await this.toQuery(input.prompt);
    const attempts = [query, query.split(" ").slice(0, 2).join(" "), keywordQuery(input.prompt, 2), "nature landscape"];
    for (const q of [...new Set(attempts)].filter(Boolean)) {
      const pick = chooseVideo(await this.search(q, input.aspectRatio), input.durationSec);
      if (pick) return { requestId: `pexels:${pick.video.id}|${pick.file.link}`, model: this.model };
    }
    throw new Error(`No stock footage found for "${query}"`);
  }

  async poll(job: QueuedJob): Promise<JobPoll> {
    const link = job.requestId.split("|")[1];
    return link ? { state: "completed", url: link } : { state: "failed", error: "Invalid stock clip reference" };
  }

  async cancel(): Promise<void> {}
}

/* -------------------------------------------------------------------------- */
/* GitHub Actions renderer — free ffmpeg + Piper voice job (see render/)       */
/* -------------------------------------------------------------------------- */

const repo = () => process.env.GITHUB_REPOSITORY || "whilekay133-netizen/clipforge-ai";
const workflow = () => process.env.GITHUB_RENDER_WORKFLOW || "render.yml";

async function gh(path: string, init: RequestInit = {}) {
  return fetch(`https://api.github.com/repos/${repo()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${requireEnv("GITHUB_DISPATCH_TOKEN")}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
  });
}

export class GithubActionsRenderer implements VideoRenderingProvider {
  readonly name = "github-actions";
  readonly model = "ffmpeg+piper";
  /** The job uploads the finished MP4 and updates the project itself. */
  readonly selfPersists = true;

  async submitRender(input: { clips: RenderClip[]; meta?: { projectId: string; generationId: string } }): Promise<QueuedJob> {
    if (!input.meta) throw new Error("GitHub renderer needs projectId and generationId");
    const { projectId, generationId } = input.meta;
    const res = await gh(`/actions/workflows/${workflow()}/dispatches`, {
      method: "POST",
      body: JSON.stringify({ ref: process.env.GITHUB_RENDER_REF || "main", inputs: { projectId, generationId } }),
    });
    if (res.status === 401 || res.status === 403 || res.status === 404) {
      throw new Error(`GitHub rejected the render request (${res.status}). Check GITHUB_DISPATCH_TOKEN permissions and that ${workflow()} exists on the ${process.env.GITHUB_RENDER_REF || "main"} branch.`);
    }
    if (!res.ok) throw new Error(`Starting the render job failed (${res.status})`);
    return { requestId: `${projectId}:${generationId}`, model: this.model };
  }

  async poll(job: QueuedJob): Promise<JobPoll> {
    const [projectId, generationId] = job.requestId.split(":");
    const { data } = await createAdminClient().from("projects").select("final_video_path").eq("id", projectId).single();
    if (data?.final_video_path) return { state: "completed", url: "" };

    const res = await gh(`/actions/workflows/${workflow()}/runs?event=workflow_dispatch&per_page=30`);
    if (!res.ok) return { state: "pending" };
    const runs = ((await res.json()) as { workflow_runs?: { display_title?: string; name?: string; status: string; conclusion: string | null; html_url: string }[] }).workflow_runs ?? [];
    const run = runs.find((r) => `${r.display_title ?? ""} ${r.name ?? ""}`.includes(generationId));
    if (run?.status === "completed") {
      if (run.conclusion === "success") {
        // The job writes the result just before it ends — re-check once before calling it a failure.
        const { data: again } = await createAdminClient().from("projects").select("final_video_path").eq("id", projectId).single();
        return again?.final_video_path ? { state: "completed", url: "" } : { state: "failed", error: "Render finished without producing a video" };
      }
      return { state: "failed", error: `Render job ${run.conclusion ?? "failed"} (${run.html_url})` };
    }
    return { state: "pending" };
  }
}
