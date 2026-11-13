import "server-only";
import { createFalClient } from "@fal-ai/client";
import { requireEnv } from "@/lib/env";
import { VOICE_LANGUAGES } from "@/lib/catalog";
import type { VoiceGenerationProvider, VoiceResult } from "./types";

/**
 * Narration with Kokoro TTS on fal.ai, then word timings from Whisper on fal.ai (for subtitles).
 * Uses the same FAL_KEY as video generation — no extra account needed.
 */
export class FalVoiceProvider implements VoiceGenerationProvider {
  readonly name = "fal";
  readonly model = "fal-ai/kokoro";

  async synthesize(input: { text: string; voiceId: string; speed?: number; language?: string }): Promise<VoiceResult> {
    const fal = createFalClient({ credentials: requireEnv("FAL_KEY") });
    const lang = VOICE_LANGUAGES.find((l) => l.name === (input.language ?? "English")) ?? VOICE_LANGUAGES[0];
    const english = lang.name === "English";
    const voice = english ? input.voiceId : lang.defaultVoice;
    const endpoint = english ? (voice.startsWith("b") ? "fal-ai/kokoro/british-english" : "fal-ai/kokoro/american-english") : lang.endpoint;

    const tts = await fal.subscribe(endpoint, { input: { prompt: input.text, voice, speed: input.speed ?? 1 } as never });
    const audioUrl = (tts.data as { audio?: { url?: string } }).audio?.url;
    if (!audioUrl) throw new Error("Voice provider returned no audio");

    const res = await fetch(audioUrl);
    if (!res.ok) throw new Error(`Audio download failed (${res.status})`);
    const audio = new Uint8Array(await res.arrayBuffer());
    const mimeType = res.headers.get("content-type") || "audio/wav";

    // Word-level timestamps for subtitles
    let words: VoiceResult["words"] = null;
    try {
      const stt = await fal.subscribe("fal-ai/whisper", { input: { audio_url: audioUrl, chunk_level: "word", language: lang.code } as never });
      const chunks = (stt.data as { chunks?: { text: string; timestamp: unknown[] }[] }).chunks ?? [];
      words = chunks
        .map((c) => ({ text: c.text.trim(), start: Number(c.timestamp[0]), end: Number(c.timestamp[1] ?? c.timestamp[0]) }))
        .filter((w) => w.text && Number.isFinite(w.start) && Number.isFinite(w.end));
    } catch (err) {
      console.error("[voice] word timing failed, continuing without subtitles:", err instanceof Error ? err.message : err);
    }
    const durationSec = words?.at(-1)?.end ?? 0;
    return { audio, mimeType, words, durationSec };
  }
}
