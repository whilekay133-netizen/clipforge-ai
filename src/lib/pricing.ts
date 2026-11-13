import "server-only";
import { MODES } from "./catalog";

export interface CreditRates {
  script: number;
  video_clip_5s: number;
  voiceover_per_15s: number;
  render: number;
  hd_multiplier: number;
}

export const DEFAULT_RATES: CreditRates = { script: 2, video_clip_5s: 10, voiceover_per_15s: 1, render: 3, hd_multiplier: 1 };

export interface EstimateInput {
  mode: string;
  durationSec: number;
  voiceEnabled: boolean;
}

export interface Estimate {
  total: number;
  clips: number;
  breakdown: { label: string; credits: number }[];
}

/** Number of 5-second clip units the pipeline will generate for a duration. */
export function clipUnits(durationSec: number) {
  return Math.max(1, Math.ceil(durationSec / 5));
}

export function estimateCredits(input: EstimateInput, rates: CreditRates = DEFAULT_RATES): Estimate {
  const mode = MODES.find((m) => m.id === input.mode);
  if (!mode) throw new Error("Unknown mode");
  const units = clipUnits(input.durationSec);
  const breakdown: { label: string; credits: number }[] = [];
  if (mode.usesScript) breakdown.push({ label: "Script & scene plan (Claude)", credits: rates.script });
  breakdown.push({ label: `Video generation (${input.durationSec}s)`, credits: Math.ceil(units * rates.video_clip_5s * rates.hd_multiplier) });
  if (mode.usesScript && input.voiceEnabled) breakdown.push({ label: "Voiceover & subtitles", credits: Math.max(1, Math.ceil(input.durationSec / 15)) * rates.voiceover_per_15s });
  if (mode.usesScript) breakdown.push({ label: "Assembly & rendering", credits: rates.render });
  return { total: breakdown.reduce((s, b) => s + b.credits, 0), clips: units, breakdown };
}

/** Rough provider cost (USD) for admin cost tracking. Update with your actual fal.ai/Anthropic rates. */
export function estimateProviderCostUsd(input: EstimateInput) {
  const units = clipUnits(input.durationSec);
  return +(units * 0.35 + (input.voiceEnabled ? input.durationSec * 0.003 : 0) + 0.03 + 0.02).toFixed(4);
}
