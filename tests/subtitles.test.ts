import { describe, expect, it } from "vitest";
import { wordsToCues, cuesToSrt, cuesToVtt } from "@/lib/subtitles";

function align(text: string, perWord = 0.3) {
  return text.split(" ").map((w, i) => ({ text: w, start: i * perWord, end: (i + 1) * perWord - 0.05 }));
}

describe("subtitles", () => {
  it("groups words into cues and breaks on sentence ends", () => {
    const cues = wordsToCues(align("Hello there. This is a test of subtitles."));
    expect(cues[0].text).toBe("Hello there.");
    expect(cues.map((c) => c.text).join(" ")).toBe("Hello there. This is a test of subtitles.");
    cues.forEach((c) => expect(c.end).toBeGreaterThan(c.start));
  });

  it("caps cue length", () => {
    const cues = wordsToCues(align("one two three four five six seven eight nine ten eleven twelve thirteen fourteen"), 20);
    cues.forEach((c) => expect(c.text.length).toBeLessThanOrEqual(20));
  });

  it("formats VTT and SRT timestamps", () => {
    const cues = [{ start: 0, end: 1.5, text: "Hi" }, { start: 61.25, end: 3725.001, text: "Later" }];
    expect(cuesToVtt(cues)).toContain("00:00:00.000 --> 00:00:01.500");
    expect(cuesToSrt(cues)).toContain("00:01:01,250 --> 01:02:05,001");
    expect(cuesToVtt(cues).startsWith("WEBVTT")).toBe(true);
  });
});
