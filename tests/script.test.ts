import { describe, expect, it, vi } from "vitest";

vi.mock("@anthropic-ai/sdk", () => ({ default: class {} }));
const { normalizeScript, scriptSchema } = await import("@/lib/providers/anthropic");

describe("script normalisation", () => {
  it("snaps scene durations to supported clip lengths and renumbers", () => {
    const raw = scriptSchema.parse({
      safe: true, title: "T", summary: "S", hook: "H", voiceover_text: "V", hashtags: [],
      scenes: [
        { scene_number: 4, narration: "a", visual_prompt: "x", duration_sec: 6 },
        { scene_number: 9, narration: "b", visual_prompt: "y", duration_sec: 9 },
      ],
    });
    const out = normalizeScript(raw, { clipLengths: [5, 10] });
    expect(out.scenes.map((s) => [s.scene_number, s.duration_sec])).toEqual([[1, 5], [2, 10]]);
  });

  it("rejects malformed model output", () => {
    expect(scriptSchema.safeParse({ safe: true, title: "", scenes: "nope" }).success).toBe(false);
  });
});
