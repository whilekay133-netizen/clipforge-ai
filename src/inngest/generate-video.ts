import "server-only";
import { NonRetriableError } from "inngest";
import { inngest } from "./client";
import { createAdminClient } from "@/lib/supabase/admin";
import { providers } from "@/lib/providers";
import { MODES, VIDEO_CAPABILITIES } from "@/lib/catalog";
import { wordsToCues } from "@/lib/subtitles";
import { BUCKET, copyRemoteToStorage, paths, uploadBytes } from "@/lib/storage";
import { closeGeneration, completeGeneration, sanitizeError, setStage } from "./pipeline";
import type { Project, ProjectSettings, Scene } from "@/lib/types";

const POLL_INTERVAL = "20s";
const MAX_SCENE_POLLS = 90; // ~30 minutes
const MAX_RENDER_POLLS = 60; // ~20 minutes
const MAX_SCENE_ATTEMPTS = 3;

export const generateVideo = inngest.createFunction(
  {
    id: "generate-video",
    retries: 3,
    concurrency: [{ key: "event.data.userId", limit: 2 }, { limit: 25 }],
    cancelOn: [{ event: "video/generate.cancelled", match: "data.generationId" }],
    onFailure: async ({ event, error }) => {
      const data = event.data.event.data;
      await closeGeneration(createAdminClient(), data.generationId, "failed", sanitizeError(error));
    },
  },
  { event: "video/generate.requested" },
  async ({ event, step }) => {
    const { projectId, generationId } = event.data;

    const start = await step.run("start", async () => {
      const admin = createAdminClient();
      const { data: gen } = await admin.from("generations").select("status").eq("id", generationId).single();
      if (!gen || ["completed", "cancelled", "failed"].includes(gen.status)) return { skip: true };
      await admin.from("generations").update({ started_at: new Date().toISOString() }).eq("id", generationId);
      await setStage(admin, projectId, generationId, "processing");
      return { skip: false };
    });
    if (start.skip) return { skipped: true };

    const project = await step.run("load-project", async () => {
      const { data } = await createAdminClient().from("projects").select("*").eq("id", projectId).single<Project>();
      if (!data) throw new NonRetriableError("Project not found");
      return data;
    });
    const settings = project.settings as ProjectSettings;
    const mode = MODES.find((m) => m.id === project.mode)!;
    const stylePrefix = `${settings.style} style.`;

    // ---------- 1. Script & scene plan ----------
    if (mode.usesScript && !project.script) {
      await step.run("stage-script", () => setStage(createAdminClient(), projectId, generationId, "generating_script"));
      await step.run("generate-script", async () => {
        const admin = createAdminClient();
        const text = providers.text();
        const sceneCount = settings.sceneCount ?? Math.max(1, Math.round(settings.durationSec / 5));
        const script = await text.generateScript({
          mode: project.mode,
          prompt: project.enhanced_prompt || project.prompt,
          durationSec: settings.durationSec,
          sceneCount,
          clipLengths: VIDEO_CAPABILITIES.clipLengths,
          style: settings.style,
          aspectRatio: settings.aspectRatio,
          language: settings.language || "English",
          audience: settings.audience,
          tone: settings.voice.tone,
          cta: settings.cta,
          platform: settings.platform,
          customInstructions: settings.customInstructions,
          category: project.category ?? undefined,
        });
        if (!script.safe) throw new NonRetriableError(`Request declined by content policy: ${script.refusal_reason ?? "prohibited content"}`);
        if (!script.scenes.length) throw new Error("Script contained no scenes");

        await admin.from("generations").update({ text_provider: text.name, text_model: text.model }).eq("id", generationId);
        await admin.from("projects").update({
          script,
          title: project.title === "Untitled video" ? script.title : project.title,
          description: script.summary,
        }).eq("id", projectId);
        await admin.from("scenes").delete().eq("project_id", projectId);
        const { error } = await admin.from("scenes").insert(script.scenes.map((s) => ({
          project_id: projectId,
          user_id: project.user_id,
          scene_number: s.scene_number,
          script: s.narration,
          visual_prompt: `${stylePrefix} ${s.visual_prompt}`,
          duration_sec: s.duration_sec,
        })));
        if (error) throw new Error(`Saving scenes failed: ${error.message}`);
        return { scenes: script.scenes.length };
      });
    } else if (!mode.usesScript) {
      await step.run("plan-single-clip", async () => {
        const admin = createAdminClient();
        const { count } = await admin.from("scenes").select("id", { count: "exact", head: true }).eq("project_id", projectId);
        if (count) return;
        await admin.from("scenes").insert({
          project_id: projectId, user_id: project.user_id, scene_number: 1,
          visual_prompt: `${stylePrefix} ${project.enhanced_prompt || project.prompt}`, duration_sec: settings.durationSec,
        });
      });
    }

    // ---------- 2. Scene generation ----------
    await step.run("stage-scenes", () => setStage(createAdminClient(), projectId, generationId, "generating_scenes"));
    await step.run("submit-scenes", async () => {
      const admin = createAdminClient();
      const video = providers.video();
      const { data: scenes } = await admin.from("scenes").select("*").eq("project_id", projectId).in("status", ["pending", "failed"]).order("scene_number");
      for (const s of (scenes ?? []) as Scene[]) {
        if (s.attempts >= MAX_SCENE_ATTEMPTS) throw new NonRetriableError(`Scene ${s.scene_number} failed ${s.attempts} times`);
        const job = await video.submitTextToVideo({ prompt: s.visual_prompt, durationSec: (s.duration_sec >= 10 ? 10 : 5) as 5 | 10, aspectRatio: settings.aspectRatio });
        await admin.from("scenes").update({ status: "submitted", provider_request_id: job.requestId, attempts: s.attempts + 1, error: null }).eq("id", s.id);
      }
      await admin.from("generations").update({ video_provider: video.name, video_model: video.model }).eq("id", generationId);
      return (scenes ?? []).length;
    });

    for (let i = 0; i < MAX_SCENE_POLLS; i++) {
      const state = await step.run(`poll-scenes-${i}`, async () => {
        const admin = createAdminClient();
        const video = providers.video();
        const { data: scenes } = await admin.from("scenes").select("*").eq("project_id", projectId).order("scene_number");
        let pending = 0, failed = 0;
        for (const s of (scenes ?? []) as Scene[]) {
          if (s.status === "failed") { failed++; continue; }
          if (s.status !== "submitted" || !s.provider_request_id) continue;
          const res = await video.poll({ requestId: s.provider_request_id, model: video.model });
          if (res.state === "pending") { pending++; continue; }
          if (res.state === "failed") {
            failed++;
            await admin.from("scenes").update({ status: "failed", error: sanitizeError(res.error) }).eq("id", s.id);
            continue;
          }
          const path = paths.scene(project.user_id, projectId, s.scene_number);
          const saved = await copyRemoteToStorage(admin, res.url, path, "video/mp4");
          await admin.from("scenes").update({ status: "completed", asset_path: path }).eq("id", s.id);
          await admin.from("assets").upsert({ user_id: project.user_id, project_id: projectId, asset_type: "scene_video", storage_path: path, mime_type: saved.contentType, size_bytes: saved.size }, { onConflict: "storage_path" });
        }
        const total = scenes?.length ?? 0;
        const done = (scenes ?? []).filter((s) => s.status === "completed").length + 0;
        if (pending) await admin.from("projects").update({ status_message: `Generating scenes — waiting on ${pending} of ${total}` }).eq("id", projectId);
        return { pending, failed, total, done };
      });
      if (state.failed > 0 && state.pending === 0) {
        throw new NonRetriableError(`${state.failed} scene(s) failed to generate`);
      }
      if (state.pending === 0) break;
      if (i === MAX_SCENE_POLLS - 1) throw new NonRetriableError("Scene generation timed out");
      await step.sleep(`wait-scenes-${i}`, POLL_INTERVAL);
    }

    // ---------- 3. Voiceover + subtitles ----------
    let narrationDuration = 0;
    if (mode.usesScript && settings.voice.enabled) {
      await step.run("stage-voice", () => setStage(createAdminClient(), projectId, generationId, "generating_voiceover"));
      narrationDuration = await step.run("voiceover", async () => {
        const admin = createAdminClient();
        const { data: p } = await admin.from("projects").select("script, voiceover_path, subtitles").eq("id", projectId).single();
        if (p?.voiceover_path) return Number((p.subtitles as { end: number }[] | null)?.at(-1)?.end ?? 0);
        const voice = providers.voice();
        const result = await voice.synthesize({ text: p!.script!.voiceover_text, voiceId: settings.voice.voiceId ?? "af_heart", speed: settings.voice.speed, language: settings.language });
        const path = paths.audio(project.user_id, projectId, result.mimeType.includes("mpeg") ? "mp3" : "wav");
        await uploadBytes(admin, path, result.audio, result.mimeType);
        await admin.from("assets").upsert({ user_id: project.user_id, project_id: projectId, asset_type: "voiceover", storage_path: path, mime_type: result.mimeType, size_bytes: result.audio.byteLength }, { onConflict: "storage_path" });
        const cues = settings.subtitles.enabled && result.words?.length ? wordsToCues(result.words) : null;
        await admin.from("projects").update({ voiceover_path: path, subtitles: cues }).eq("id", projectId);
        await admin.from("generations").update({ voice_provider: voice.name, voice_model: voice.model }).eq("id", generationId);
        return result.durationSec;
      });
    }

    // ---------- 4. Assembly & rendering ----------
    const needsCompose = mode.usesScript; // single-clip text-to-video is already a finished video
    if (!needsCompose) {
      await step.run("finalize-single-clip", async () => {
        const admin = createAdminClient();
        const { data: s } = await admin.from("scenes").select("asset_path").eq("project_id", projectId).eq("scene_number", 1).single();
        const finalPath = paths.render(project.user_id, projectId);
        const { error } = await admin.storage.from(BUCKET).copy(s!.asset_path!, finalPath);
        if (error && !/exists/i.test(error.message)) throw new Error(error.message);
        await admin.from("projects").update({ final_video_path: finalPath, duration_sec: settings.durationSec, aspect_ratio: settings.aspectRatio, resolution: "HD" }).eq("id", projectId);
      });
    } else {
      await step.run("stage-assemble", () => setStage(createAdminClient(), projectId, generationId, "assembling_video"));
      const renderJob = await step.run("submit-render", async () => {
        const admin = createAdminClient();
        const renderer = providers.render();
        const { data: scenes } = await admin.from("scenes").select("*").eq("project_id", projectId).eq("status", "completed").order("scene_number");
        const { data: p } = await admin.from("projects").select("voiceover_path").eq("id", projectId).single();
        const sign = async (path: string) => {
          const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, 6 * 3600);
          if (error || !data) throw new Error(`Signing failed: ${error?.message}`);
          return data.signedUrl;
        };
        const clips = await Promise.all(((scenes ?? []) as Scene[]).map(async (s) => ({ url: await sign(s.asset_path!), durationSec: Number(s.duration_sec) })));
        const narrationUrl = p?.voiceover_path ? await sign(p.voiceover_path) : undefined;
        const job = await renderer.submitRender({ clips, narrationUrl, narrationDurationSec: narrationDuration || undefined });
        await admin.from("generations").update({ render_provider: renderer.name, render_model: renderer.model, render_request_id: job.requestId }).eq("id", generationId);
        return { ...job, totalDuration: clips.reduce((t, c) => t + c.durationSec, 0) };
      });

      await step.run("stage-render", () => setStage(createAdminClient(), projectId, generationId, "rendering"));
      for (let i = 0; i < MAX_RENDER_POLLS; i++) {
        const done = await step.run(`poll-render-${i}`, async () => {
          const admin = createAdminClient();
          const renderer = providers.render();
          const res = await renderer.poll({ requestId: renderJob.requestId, model: renderJob.model });
          if (res.state === "pending") return false;
          if (res.state === "failed") throw new NonRetriableError(`Rendering failed: ${res.error}`);
          const finalPath = paths.render(project.user_id, projectId);
          const saved = await copyRemoteToStorage(admin, res.url, finalPath, "video/mp4");
          await admin.from("assets").upsert({ user_id: project.user_id, project_id: projectId, asset_type: "render", storage_path: finalPath, mime_type: saved.contentType, size_bytes: saved.size }, { onConflict: "storage_path" });
          let thumbPath: string | null = null;
          if (res.thumbnailUrl) {
            thumbPath = paths.thumbnail(project.user_id, projectId);
            const t = await copyRemoteToStorage(admin, res.thumbnailUrl, thumbPath, "image/jpeg");
            await admin.from("assets").upsert({ user_id: project.user_id, project_id: projectId, asset_type: "thumbnail", storage_path: thumbPath, mime_type: t.contentType, size_bytes: t.size }, { onConflict: "storage_path" });
          }
          await admin.from("projects").update({
            final_video_path: finalPath, thumbnail_path: thumbPath, duration_sec: renderJob.totalDuration,
            aspect_ratio: settings.aspectRatio, resolution: "HD",
          }).eq("id", projectId);
          return true;
        });
        if (done) break;
        if (i === MAX_RENDER_POLLS - 1) throw new NonRetriableError("Rendering timed out");
        await step.sleep(`wait-render-${i}`, POLL_INTERVAL);
      }
    }

    // ---------- 5. Commit credits & notify ----------
    await step.run("complete", () => completeGeneration(createAdminClient(), generationId));
    return { ok: true };
  },
);

export const functions = [generateVideo];
