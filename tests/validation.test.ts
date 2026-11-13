import { describe, expect, it } from "vitest";
import { createGenerationSchema } from "@/lib/validation";

const base = {
  mode: "faceless",
  prompt: "Explain how volcanoes form, with dramatic visuals.",
  settings: {
    durationSec: 30, aspectRatio: "9:16", quality: "hd", style: "Cinematic",
    voice: { enabled: true, voiceId: "af_heart", speed: 1 },
    subtitles: { enabled: true, position: "bottom", size: "md", color: "#ffffff" },
    music: "none",
  },
};

describe("createGenerationSchema", () => {
  it("accepts a valid faceless request", () => {
    expect(createGenerationSchema.safeParse(base).success).toBe(true);
  });
  it("rejects unsupported aspect ratios (4:5 not supported by current model)", () => {
    expect(createGenerationSchema.safeParse({ ...base, settings: { ...base.settings, aspectRatio: "4:5" } }).success).toBe(false);
  });
  it("rejects durations the mode does not support", () => {
    expect(createGenerationSchema.safeParse({ ...base, settings: { ...base.settings, durationSec: 45 } }).success).toBe(false);
    expect(createGenerationSchema.safeParse({ ...base, mode: "text_to_video", settings: { ...base.settings, durationSec: 30, voice: { enabled: false } } }).success).toBe(false);
  });
  it("rejects voiceover on single-clip text-to-video", () => {
    expect(createGenerationSchema.safeParse({ ...base, mode: "text_to_video", settings: { ...base.settings, durationSec: 5 } }).success).toBe(false);
  });
  it("rejects modes that are not available yet", () => {
    expect(createGenerationSchema.safeParse({ ...base, mode: "image_to_video", settings: { ...base.settings, durationSec: 5, voice: { enabled: false } } }).success).toBe(false);
  });
  it("rejects too-short prompts and unknown voices", () => {
    expect(createGenerationSchema.safeParse({ ...base, prompt: "hi" }).success).toBe(false);
    expect(createGenerationSchema.safeParse({ ...base, settings: { ...base.settings, voice: { enabled: true, voiceId: "x" } } }).success).toBe(false);
  });
});
