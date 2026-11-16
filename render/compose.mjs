// ffmpeg helpers for the render job (kept separate so they can be tested with synthetic media).
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { FPS, subtitleStyle } from "./lib.mjs";

export function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, ...opts });
  if (res.error) throw new Error(`${cmd} could not start: ${res.error.message}`);
  if (res.status !== 0) throw new Error(`${cmd} failed (${res.status}): ${(res.stderr || "").split("\n").slice(-12).join("\n")}`);
  return res.stdout;
}

export const duration = (file) => Number(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file]).trim()) || 0;

/** One scene -> one mp4 segment: cropped to the frame, voice (or silence) mixed in, subtitles burned in. */
export function encodeSegment({ clip, voiceFile, srtFile, subtitleSettings, width, height, length, out }) {
  let vf = `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},fps=${FPS},setsar=1`;
  if (srtFile) vf += `,subtitles=filename='${srtFile}':force_style='${subtitleStyle(subtitleSettings, width, height)}'`;
  const audioIn = voiceFile ? ["-i", voiceFile] : ["-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo"];
  run("ffmpeg", [
    "-y", "-loglevel", "error", "-stream_loop", "-1", "-i", clip, ...audioIn,
    "-map", "0:v:0", "-map", "1:a:0", "-vf", vf,
    "-af", "aresample=44100,aformat=channel_layouts=stereo,apad",
    "-t", String(length),
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-ac", "2", out,
  ]);
}

export function concatSegments(segments, listFile, out) {
  writeFileSync(listFile, segments.map((s) => `file '${s}'`).join("\n"));
  run("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", "-movflags", "+faststart", out]);
}
