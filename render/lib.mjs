// Pure helpers for the render job (unit-tested from tests/render-lib.test.ts).

export const DIMENSIONS = { "16:9": [1280, 720], "9:16": [720, 1280], "1:1": [720, 720] };
export const FPS = 30;

export function dimensionsFor(aspectRatio) {
  return DIMENSIONS[aspectRatio] ?? DIMENSIONS["16:9"];
}

/** Piper voices (https://huggingface.co/rhasspy/piper-voices) standing in for the catalog's voice ids. */
const EN_VOICES = {
  af_heart: "en_US-lessac-medium",
  af_bella: "en_US-amy-medium",
  af_nicole: "en_US-amy-medium",
  am_michael: "en_US-ryan-medium",
  am_adam: "en_US-joe-medium",
  am_onyx: "en_US-ryan-high",
  bf_emma: "en_GB-jenny_dioco-medium",
  bm_george: "en_GB-alan-medium",
};
const LANG_VOICES = { Spanish: "es_ES-davefx-medium", French: "fr_FR-siwis-medium", Hindi: "hi_IN-pratham-medium" };

export function piperVoiceFor(language, voiceId) {
  if (language && language !== "English" && LANG_VOICES[language]) return LANG_VOICES[language];
  return EN_VOICES[voiceId] ?? EN_VOICES.af_heart;
}

/** Hugging Face paths for a Piper voice name such as en_US-lessac-medium. */
export function piperVoiceUrls(name) {
  const m = /^([a-z]{2})_([A-Z]{2})-(.+)-(x_low|low|medium|high)$/.exec(name);
  if (!m) throw new Error(`Unrecognised Piper voice name: ${name}`);
  const [, family, region, speaker, quality] = m;
  const base = `https://huggingface.co/rhasspy/piper-voices/resolve/main/${family}/${family}_${region}/${speaker}/${quality}/${name}`;
  return { model: `${base}.onnx`, config: `${base}.onnx.json` };
}

/**
 * Spread a scene's words over its narration audio (Piper gives no word timings) weighting by length,
 * then group into readable cues. Times are relative to the start of the scene.
 */
export function cuesForNarration(text, audioDuration, offset = 0, maxChars = 42, maxDuration = 2.6) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length || !(audioDuration > 0)) return [];
  const weights = words.map((w) => w.length + 1);
  const total = weights.reduce((a, b) => a + b, 0);
  let t = 0;
  const timed = words.map((w, i) => {
    const start = t;
    t += (weights[i] / total) * audioDuration;
    return { text: w, start, end: t };
  });
  const cues = [];
  let cue = null;
  for (const w of timed) {
    if (cue && (cue.text.length + 1 + w.text.length > maxChars || w.end - cue.start > maxDuration)) {
      cues.push(cue);
      cue = null;
    }
    cue = cue ? { start: cue.start, end: w.end, text: `${cue.text} ${w.text}` } : { start: w.start, end: w.end, text: w.text };
    if (/[.!?]$/.test(w.text)) {
      cues.push(cue);
      cue = null;
    }
  }
  if (cue) cues.push(cue);
  const r = (n) => Math.round(n * 1000) / 1000;
  return cues.map((c) => ({ start: r(c.start + offset), end: r(Math.max(c.end, c.start + 0.3) + offset), text: c.text }));
}

const ts = (seconds) => {
  const ms = Math.round(seconds * 1000);
  const pad = (n, l = 2) => String(n).padStart(l, "0");
  return `${pad(Math.floor(ms / 3_600_000))}:${pad(Math.floor((ms % 3_600_000) / 60_000))}:${pad(Math.floor((ms % 60_000) / 1000))},${pad(ms % 1000, 3)}`;
};

export function cuesToSrt(cues) {
  return cues.map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(c.end)}\n${c.text}`).join("\n\n") + "\n";
}

/** "#rrggbb" -> ASS "&H00BBGGRR". */
export function assColor(hex, fallback = "#ffffff") {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? "") ?? /^#?([0-9a-f]{6})$/i.exec(fallback);
  const [r, g, b] = [m[1].slice(0, 2), m[1].slice(2, 4), m[1].slice(4, 6)];
  return `&H00${b}${g}${r}`.toUpperCase();
}

/**
 * ffmpeg renders SRT through libass on a 384x288 canvas that is then scaled to the frame, so sizes are
 * given in that canvas' units: px * (288 / frameHeight).
 */
export function subtitleStyle(subtitles, width, height) {
  const unit = 288 / height;
  const short = Math.min(width, height);
  const divisor = { sm: 22, md: 18, lg: 14 }[subtitles?.size] ?? 18;
  const alignment = { bottom: 2, middle: 5, top: 8 }[subtitles?.position] ?? 2;
  return [
    "FontName=DejaVu Sans",
    `Fontsize=${Math.max(6, Math.round((short / divisor) * unit))}`,
    `PrimaryColour=${assColor(subtitles?.color)}`,
    "OutlineColour=&H00000000",
    "BorderStyle=1",
    "Outline=1.5",
    "Shadow=0",
    "Bold=1",
    `Alignment=${alignment}`,
    `MarginV=${Math.round(height * 0.07 * unit)}`,
    "MarginL=23",
    "MarginR=23",
  ].join(",");
}

/** Scene length: the planned duration, stretched when the narration needs more room. */
export function sceneLength(planned, narrationSec) {
  const need = narrationSec > 0 ? narrationSec + 0.5 : 0;
  return Math.round(Math.max(Number(planned) || 5, need) * 100) / 100;
}
