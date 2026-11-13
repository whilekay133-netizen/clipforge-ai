import "server-only";
import { createFalClient } from "@fal-ai/client";
import { requireEnv } from "@/lib/env";
import type { JobPoll, QueuedJob, RenderClip, VideoGenerationProvider, VideoRenderingProvider } from "./types";

function client() {
  return createFalClient({ credentials: requireEnv("FAL_KEY") });
}

function fileUrl(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value && "url" in value) return String((value as { url: string }).url);
  return undefined;
}

async function pollFal(job: QueuedJob, pick: (data: Record<string, unknown>) => { url?: string; thumbnailUrl?: string }): Promise<JobPoll> {
  const fal = client();
  try {
    const status = await fal.queue.status(job.model, { requestId: job.requestId, logs: false });
    if (status.status !== "COMPLETED") return { state: "pending" };
    const result = await fal.queue.result(job.model, { requestId: job.requestId });
    const { url, thumbnailUrl } = pick(result.data as Record<string, unknown>);
    if (!url) return { state: "failed", error: "Provider returned no output file" };
    return { state: "completed", url, thumbnailUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // 4xx from result() means the job itself failed; network errors should be retried by the workflow.
    if (/422|400|validation|failed/i.test(message)) return { state: "failed", error: message.slice(0, 500) };
    throw err;
  }
}

export class FalVideoProvider implements VideoGenerationProvider {
  readonly name = "fal";
  readonly model = process.env.FAL_TEXT_TO_VIDEO_MODEL || "fal-ai/kling-video/v2.5-turbo/pro/text-to-video";

  async submitTextToVideo(input: { prompt: string; durationSec: 5 | 10; aspectRatio: string; negativePrompt?: string }): Promise<QueuedJob> {
    const fal = client();
    const res = await fal.queue.submit(this.model, {
      input: {
        prompt: input.prompt,
        duration: String(input.durationSec) as "5" | "10",
        aspect_ratio: input.aspectRatio as "16:9" | "9:16" | "1:1",
        negative_prompt: input.negativePrompt ?? "blur, distort, low quality, text, watermark, logo",
      },
    } as never);
    return { requestId: res.request_id, model: this.model };
  }

  poll(job: QueuedJob) {
    return pollFal(job, (d) => ({ url: fileUrl(d.video) }));
  }

  async cancel(job: QueuedJob) {
    await client().queue.cancel(job.model, { requestId: job.requestId }).catch(() => undefined);
  }
}

/** Final assembly through fal's hosted FFmpeg compose endpoint (no self-managed render worker needed). */
export class FalComposeRenderer implements VideoRenderingProvider {
  readonly name = "fal";
  readonly model = process.env.FAL_COMPOSE_MODEL || "fal-ai/ffmpeg-api/compose";

  async submitRender(input: { clips: RenderClip[]; narrationUrl?: string; narrationDurationSec?: number }): Promise<QueuedJob> {
    let t = 0;
    const videoKeyframes = input.clips.map((c) => {
      const kf = { url: c.url, timestamp: Math.round(t * 1000), duration: Math.round(c.durationSec * 1000) };
      t += c.durationSec;
      return kf;
    });
    const tracks: { id: string; type: string; keyframes: { url: string; timestamp: number; duration: number }[] }[] = [
      { id: "video", type: "video", keyframes: videoKeyframes },
    ];
    if (input.narrationUrl) {
      tracks.push({ id: "narration", type: "audio", keyframes: [{ url: input.narrationUrl, timestamp: 0, duration: Math.round(Math.min(input.narrationDurationSec ?? t, t) * 1000) }] });
    }
    const res = await client().queue.submit(this.model, { input: { tracks } } as never);
    return { requestId: res.request_id, model: this.model };
  }

  poll(job: QueuedJob) {
    return pollFal(job, (d) => ({ url: fileUrl(d.video_url), thumbnailUrl: fileUrl(d.thumbnail_url) }));
  }
}
