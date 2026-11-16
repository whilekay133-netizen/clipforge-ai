import "server-only";
import { AnthropicTextProvider } from "./anthropic";
import { FalComposeRenderer, FalVideoProvider } from "./fal";
import { FalVoiceProvider } from "./fal-voice";
import { GithubActionsRenderer, StockVideoProvider } from "./stock";
import type { TextGenerationProvider, VideoGenerationProvider, VideoRenderingProvider, VoiceGenerationProvider } from "./types";

/**
 * "fal"   — AI-generated clips, Kokoro voice and fal ffmpeg composition (needs FAL_KEY, paid per clip).
 * "stock" — Pexels stock footage; voice, subtitles and rendering run in a GitHub Actions job (free).
 * Set VIDEO_BACKEND to force one; otherwise fal is used only when FAL_KEY exists.
 */
export type VideoBackend = "fal" | "stock";
export const videoBackend = (): VideoBackend => {
  const forced = process.env.VIDEO_BACKEND;
  if (forced === "fal" || forced === "stock") return forced;
  return process.env.FAL_KEY ? "fal" : "stock";
};

// Swap implementations here to change vendors without touching product logic.
export const providers = {
  text: (): TextGenerationProvider => new AnthropicTextProvider(),
  video: (): VideoGenerationProvider => (videoBackend() === "stock" ? new StockVideoProvider() : new FalVideoProvider()),
  voice: (): VoiceGenerationProvider => new FalVoiceProvider(),
  render: (): VideoRenderingProvider => (videoBackend() === "stock" ? new GithubActionsRenderer() : new FalComposeRenderer()),
};
