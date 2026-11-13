import type { SubtitleCue } from "./types";

export interface TimedWord { text: string; start: number; end: number }

/** Group word timings into readable subtitle cues (max ~42 chars / 2.5 s, break on sentence ends). */
export function wordsToCues(words: TimedWord[], maxChars = 42, maxDuration = 2.5): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  let cue = null as SubtitleCue | null;
  for (const w of words) {
    const prev: SubtitleCue | null = cue;
    if (prev && (prev.text.length + 1 + w.text.length > maxChars || w.end - prev.start > maxDuration)) {
      cues.push(prev);
      cue = null;
    }
    const base: SubtitleCue | null = cue;
    const next: SubtitleCue = base ? { start: base.start, text: `${base.text} ${w.text}`, end: w.end } : { start: w.start, end: w.end, text: w.text };
    if (/[.!?]$/.test(w.text)) {
      cues.push(next);
      cue = null;
    } else cue = next;
  }
  if (cue) cues.push(cue);
  return cues.map((c) => ({ start: round(c.start), end: round(Math.max(c.end, c.start + 0.3)), text: c.text }));
}

const round = (n: number) => Math.round(n * 1000) / 1000;

function ts(seconds: number, sep: "." | ",") {
  const ms = Math.round(seconds * 1000);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const r = ms % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}${sep}${String(r).padStart(3, "0")}`;
}

export function cuesToVtt(cues: SubtitleCue[]) {
  return "WEBVTT\n\n" + cues.map((c, i) => `${i + 1}\n${ts(c.start, ".")} --> ${ts(c.end, ".")}\n${c.text}`).join("\n\n") + "\n";
}

export function cuesToSrt(cues: SubtitleCue[]) {
  return cues.map((c, i) => `${i + 1}\n${ts(c.start, ",")} --> ${ts(c.end, ",")}\n${c.text}`).join("\n\n") + "\n";
}
