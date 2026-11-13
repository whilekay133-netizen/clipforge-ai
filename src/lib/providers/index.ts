import "server-only";
import { AnthropicTextProvider } from "./anthropic";
import { FalComposeRenderer, FalVideoProvider } from "./fal";
import { FalVoiceProvider } from "./fal-voice";
import type { TextGenerationProvider, VideoGenerationProvider, VideoRenderingProvider, VoiceGenerationProvider } from "./types";

// Swap implementations here to change vendors without touching product logic.
export const providers = {
  text: (): TextGenerationProvider => new AnthropicTextProvider(),
  video: (): VideoGenerationProvider => new FalVideoProvider(),
  voice: (): VoiceGenerationProvider => new FalVoiceProvider(),
  render: (): VideoRenderingProvider => new FalComposeRenderer(),
};
