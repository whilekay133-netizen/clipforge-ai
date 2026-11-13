import { describe, expect, it } from "vitest";
import { clipUnits, estimateCredits, DEFAULT_RATES } from "@/lib/pricing";

describe("pricing", () => {
  it("rounds durations up to 5-second clip units", () => {
    expect(clipUnits(15)).toBe(3);
    expect(clipUnits(16)).toBe(4);
    expect(clipUnits(1)).toBe(1);
  });

  it("estimates a 30s faceless video with voiceover", () => {
    const e = estimateCredits({ mode: "faceless", durationSec: 30, voiceEnabled: true });
    // script 2 + 6 clips * 10 + voice 2 + render 3
    expect(e.total).toBe(2 + 60 + 2 + 3);
    expect(e.breakdown.reduce((s, b) => s + b.credits, 0)).toBe(e.total);
  });

  it("charges no script/voice/render for single-clip text-to-video", () => {
    const e = estimateCredits({ mode: "text_to_video", durationSec: 10, voiceEnabled: false });
    expect(e.total).toBe(20);
    expect(e.breakdown).toHaveLength(1);
  });

  it("applies configurable rates", () => {
    const e = estimateCredits({ mode: "faceless", durationSec: 15, voiceEnabled: false }, { ...DEFAULT_RATES, video_clip_5s: 20, hd_multiplier: 1.5 });
    expect(e.total).toBe(2 + Math.ceil(3 * 20 * 1.5) + 3);
  });

  it("rejects unknown modes", () => {
    expect(() => estimateCredits({ mode: "nope", durationSec: 15, voiceEnabled: false })).toThrow();
  });
});
