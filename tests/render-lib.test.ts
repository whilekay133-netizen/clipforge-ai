import { describe, expect, it } from "vitest";
// @ts-expect-error — plain ESM helpers shared with the GitHub Actions render job
import { assColor, cuesForNarration, cuesToSrt, dimensionsFor, piperVoiceFor, piperVoiceUrls, sceneLength, subtitleStyle } from "../render/lib.mjs";
import { chooseVideo, keywordQuery, pickVideoFile } from "@/lib/providers/stock";

describe("render lib", () => {
  it("maps aspect ratios to HD frame sizes", () => {
    expect(dimensionsFor("16:9")).toEqual([1280, 720]);
    expect(dimensionsFor("9:16")).toEqual([720, 1280]);
    expect(dimensionsFor("1:1")).toEqual([720, 720]);
    expect(dimensionsFor("weird")).toEqual([1280, 720]);
  });

  it("picks Piper voices and builds model URLs", () => {
    expect(piperVoiceFor("English", "am_adam")).toBe("en_US-joe-medium");
    expect(piperVoiceFor("English", "unknown")).toBe("en_US-lessac-medium");
    expect(piperVoiceFor("Spanish", "af_heart")).toBe("es_ES-davefx-medium");
    const u = piperVoiceUrls("en_GB-jenny_dioco-medium");
    expect(u.model).toBe("https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/jenny_dioco/medium/en_GB-jenny_dioco-medium.onnx");
    expect(u.config.endsWith(".onnx.json")).toBe(true);
    expect(() => piperVoiceUrls("nope")).toThrow();
  });

  it("spreads narration words over the audio and groups cues", () => {
    const text = "Lagos wakes up early. Traders open their stalls while the sun rises over the lagoon.";
    const cues = cuesForNarration(text, 8, 0);
    expect(cues.length).toBeGreaterThanOrEqual(2);
    expect(cues[0].start).toBe(0);
    expect(cues.at(-1)!.end).toBeCloseTo(8, 1);
    for (const c of cues) expect(c.text.length).toBeLessThanOrEqual(42);
    for (let i = 1; i < cues.length; i++) expect(cues[i].start).toBeGreaterThanOrEqual(cues[i - 1].end - 0.001);
    expect(cuesForNarration("", 5)).toEqual([]);
    expect(cuesForNarration("hi", 0)).toEqual([]);
  });

  it("writes SRT and ASS colours", () => {
    expect(cuesToSrt([{ start: 0, end: 1.5, text: "Hello" }])).toBe("1\n00:00:00,000 --> 00:00:01,500\nHello\n");
    expect(assColor("#ff8800")).toBe("&H000088FF");
    expect(assColor("garbage")).toBe("&H00FFFFFF");
  });

  it("styles subtitles relative to the frame", () => {
    const s = subtitleStyle({ size: "lg", position: "top", color: "#ffffff" }, 720, 1280);
    expect(s).toContain("Alignment=8");
    expect(s).toContain("Fontsize=12");
    expect(subtitleStyle({ size: "md" }, 1280, 720)).toContain("Fontsize=16");
  });

  it("stretches a scene when the narration needs more time", () => {
    expect(sceneLength(5, 0)).toBe(5);
    expect(sceneLength(5, 3)).toBe(5);
    expect(sceneLength(5, 7.2)).toBe(7.7);
  });
});

describe("stock footage selection", () => {
  const file = (w: number, h: number, type = "video/mp4") => ({ file_type: type, width: w, height: h, link: `https://v/${w}x${h}` });
  it("prefers the HD file", () => {
    const v = { id: 1, duration: 10, video_files: [file(640, 360), file(1280, 720), file(3840, 2160), file(1280, 720, "video/webm")] };
    expect(pickVideoFile(v)?.link).toBe("https://v/1280x720");
    expect(pickVideoFile({ id: 2, duration: 5, video_files: [file(100, 100, "video/webm")] })).toBeNull();
  });
  it("prefers clips long enough, falls back to the longest", () => {
    const vs = [1, 2, 3].map((id) => ({ id, duration: id * 4, video_files: [file(1280, 720)] }));
    expect(chooseVideo(vs, 9, () => 0)?.video.id).toBe(3);
    expect(chooseVideo(vs, 60, () => 0)?.video.id).toBe(3);
    expect(chooseVideo([], 5)).toBeNull();
  });
  it("builds a fallback keyword query", () => {
    expect(keywordQuery("Cinematic slow pan over a busy Lagos market at sunrise, wide angle")).toBe("busy lagos market sunrise");
  });
});
