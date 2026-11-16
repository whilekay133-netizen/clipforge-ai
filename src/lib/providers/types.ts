// Provider abstraction (PRD §3.3). Product logic depends only on these interfaces.
import type { VideoScript } from "@/lib/types";
import type { TimedWord } from "@/lib/subtitles";

export interface ScriptRequest {
  mode: string;
  prompt: string;
  durationSec: number;
  sceneCount: number;
  clipLengths: readonly number[];
  style: string;
  aspectRatio: string;
  language: string;
  audience?: string;
  tone?: string;
  cta?: string;
  platform?: string;
  customInstructions?: string;
  category?: string;
}

export interface TextGenerationProvider {
  readonly name: string;
  readonly model: string;
  generateScript(req: ScriptRequest): Promise<VideoScript>;
  enhancePrompt(prompt: string, mode: string): Promise<string>;
}

export interface QueuedJob { requestId: string; model: string }
export type JobPoll =
  | { state: "pending" }
  | { state: "completed"; url: string; thumbnailUrl?: string }
  | { state: "failed"; error: string };

export interface VideoGenerationProvider {
  readonly name: string;
  readonly model: string;
  submitTextToVideo(input: { prompt: string; durationSec: 5 | 10; aspectRatio: string; negativePrompt?: string }): Promise<QueuedJob>;
  poll(job: QueuedJob): Promise<JobPoll>;
  cancel(job: QueuedJob): Promise<void>;
}

export interface VoiceResult { audio: Uint8Array; mimeType: string; words: TimedWord[] | null; durationSec: number }
export interface VoiceGenerationProvider {
  readonly name: string;
  readonly model: string;
  synthesize(input: { text: string; voiceId: string; speed?: number; language?: string }): Promise<VoiceResult>;
}

export interface RenderClip { url: string; durationSec: number }
export interface VideoRenderingProvider {
  readonly name: string;
  readonly model: string;
  /** True when the renderer stores the finished video and updates the project itself (no download step needed). */
  readonly selfPersists?: boolean;
  submitRender(input: { clips: RenderClip[]; narrationUrl?: string; narrationDurationSec?: number; meta?: { projectId: string; generationId: string } }): Promise<QueuedJob>;
  poll(job: QueuedJob): Promise<JobPoll>;
}
