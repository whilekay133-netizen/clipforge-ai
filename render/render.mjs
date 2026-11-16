// ClipForge free render job. Run by .github/workflows/render.yml.
//   Reads a project's scenes (stock clips already saved in Supabase Storage), narrates each scene with Piper,
//   burns subtitles, joins everything with ffmpeg, uploads final.mp4 and updates the project.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PROJECT_ID, GENERATION_ID  (optional: PIPER_BIN)
import { createClient } from "@supabase/supabase-js";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { concatSegments, duration, encodeSegment, run } from "./compose.mjs";
import { cuesForNarration, cuesToSrt, dimensionsFor, piperVoiceFor, piperVoiceUrls, sceneLength } from "./lib.mjs";

const BUCKET = "media";
const env = (name) => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
};
const log = (...a) => console.log("[render]", ...a);

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}) for ${new URL(url).host}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

async function ensureVoice(name, dir) {
  const model = path.join(dir, `${name}.onnx`);
  if (existsSync(model) && existsSync(`${model}.json`)) return model;
  const urls = piperVoiceUrls(name);
  log("downloading voice", name);
  await download(urls.model, model);
  await download(urls.config, `${model}.json`);
  return model;
}

function narrate(model, text, speed, out) {
  const bin = process.env.PIPER_BIN || "piper";
  const scale = Math.min(1.4, Math.max(0.7, 1 / (Number(speed) || 1)));
  run(bin, ["--model", model, "--output_file", out, "--length_scale", String(scale)], { input: text.replace(/\s+/g, " ").trim() });
}

async function main() {
  const projectId = env("PROJECT_ID");
  const generationId = env("GENERATION_ID");
  const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

  const { data: gen, error: genErr } = await admin.from("generations").select("id, project_id, status").eq("id", generationId).single();
  if (genErr || !gen) throw new Error(`Generation not found: ${genErr?.message ?? generationId}`);
  if (gen.project_id !== projectId) throw new Error("Generation does not belong to this project");
  if (["completed", "cancelled", "failed"].includes(gen.status)) return log(`generation already ${gen.status}; nothing to do`);

  const { data: project, error: pErr } = await admin.from("projects").select("*").eq("id", projectId).single();
  if (pErr || !project) throw new Error(`Project not found: ${pErr?.message ?? projectId}`);
  const { data: scenes, error: sErr } = await admin.from("scenes").select("*").eq("project_id", projectId).eq("status", "completed").order("scene_number");
  if (sErr) throw new Error(sErr.message);
  if (!scenes?.length) throw new Error("No completed scenes to render");

  const settings = project.settings ?? {};
  const [W, H] = dimensionsFor(settings.aspectRatio);
  const voiceOn = Boolean(settings.voice?.enabled);
  const subsOn = Boolean(settings.subtitles?.enabled);
  const work = mkdtempSync(path.join(tmpdir(), "clipforge-"));
  log(`project ${projectId}: ${scenes.length} scenes, ${W}x${H}, voice=${voiceOn}, subtitles=${subsOn}`);

  let model = null;
  if (voiceOn) model = await ensureVoice(piperVoiceFor(settings.language, settings.voice?.voiceId), work);

  const segments = [];
  const narrationFiles = [];
  const allCues = [];
  let timeline = 0;

  for (const scene of scenes) {
    const n = scene.scene_number;
    const clip = path.join(work, `clip-${n}.mp4`);
    const { data: blob, error: dErr } = await admin.storage.from(BUCKET).download(scene.asset_path);
    if (dErr || !blob) throw new Error(`Scene ${n}: could not download clip (${dErr?.message})`);
    writeFileSync(clip, Buffer.from(await blob.arrayBuffer()));

    let voiceFile = null;
    let narrationSec = 0;
    const text = String(scene.script ?? "").trim();
    if (voiceOn && text && model) {
      voiceFile = path.join(work, `voice-${n}.wav`);
      narrate(model, text, settings.voice?.speed, voiceFile);
      narrationSec = duration(voiceFile);
    }

    const length = sceneLength(scene.duration_sec, narrationSec);
    const cues = subsOn && voiceFile ? cuesForNarration(text, narrationSec, 0) : [];
    let srtFile = null;
    if (cues.length) {
      srtFile = path.join(work, `scene-${n}.srt`);
      writeFileSync(srtFile, cuesToSrt(cues));
    }
    const seg = path.join(work, `seg-${n}.mp4`);
    encodeSegment({ clip, voiceFile, srtFile, subtitleSettings: settings.subtitles, width: W, height: H, length, out: seg });
    segments.push(seg);
    if (voiceFile) narrationFiles.push({ file: voiceFile, length });
    for (const c of cues) allCues.push({ ...c, start: Math.round((c.start + timeline) * 1000) / 1000, end: Math.round((c.end + timeline) * 1000) / 1000 });
    timeline += length;
    log(`scene ${n}: ${length}s${narrationSec ? ` (narration ${narrationSec.toFixed(1)}s)` : ""}`);
  }

  const finalFile = path.join(work, "final.mp4");
  concatSegments(segments, path.join(work, "list.txt"), finalFile);
  const total = duration(finalFile);

  const thumb = path.join(work, "thumbnail.jpg");
  run("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(Math.min(1, total / 2)), "-i", finalFile, "-frames:v", "1", "-q:v", "3", thumb]);

  let voiceoverFile = null;
  if (narrationFiles.length) {
    voiceoverFile = path.join(work, "voiceover.mp3");
    run("ffmpeg", ["-y", "-loglevel", "error", "-i", finalFile, "-vn", "-c:a", "libmp3lame", "-q:a", "4", voiceoverFile]);
  }

  const base = `users/${project.user_id}/projects/${projectId}`;
  const uploads = [
    { path: `${base}/renders/final.mp4`, file: finalFile, type: "video/mp4", asset: "render" },
    { path: `${base}/renders/thumbnail.jpg`, file: thumb, type: "image/jpeg", asset: "thumbnail" },
    ...(voiceoverFile ? [{ path: `${base}/audio/voiceover.mp3`, file: voiceoverFile, type: "audio/mpeg", asset: "voiceover" }] : []),
  ];
  for (const u of uploads) {
    const bytes = readFileSync(u.file);
    const { error } = await admin.storage.from(BUCKET).upload(u.path, bytes, { contentType: u.type, upsert: true });
    if (error) throw new Error(`Upload failed (${u.path}): ${error.message}`);
    await admin.from("assets").upsert({ user_id: project.user_id, project_id: projectId, asset_type: u.asset, storage_path: u.path, mime_type: u.type, size_bytes: bytes.byteLength }, { onConflict: "storage_path" });
    log(`uploaded ${u.path} (${(bytes.byteLength / 1e6).toFixed(1)} MB)`);
  }

  // Written last: the site treats final_video_path as "render finished".
  const { error: upErr } = await admin.from("projects").update({
    thumbnail_path: `${base}/renders/thumbnail.jpg`,
    voiceover_path: voiceoverFile ? `${base}/audio/voiceover.mp3` : null,
    subtitles: subsOn && allCues.length ? allCues : null,
    duration_sec: Math.round(total * 100) / 100,
    aspect_ratio: settings.aspectRatio ?? "16:9",
    resolution: "HD",
    final_video_path: `${base}/renders/final.mp4`,
  }).eq("id", projectId);
  if (upErr) throw new Error(`Saving project failed: ${upErr.message}`);
  log(`done: ${total.toFixed(1)}s video`);
}

main().catch((err) => {
  console.error("[render] FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
