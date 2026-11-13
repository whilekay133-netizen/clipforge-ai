import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { requireEnv } from "@/lib/env";
import type { VideoScript } from "@/lib/types";
import type { ScriptRequest, TextGenerationProvider } from "./types";

export const scriptSchema = z.object({
  safe: z.boolean(),
  refusal_reason: z.string().optional(),
  title: z.string().min(1).max(120),
  summary: z.string().max(600),
  hook: z.string().max(300),
  scenes: z.array(z.object({
    scene_number: z.number().int().positive(),
    narration: z.string().max(1200),
    visual_prompt: z.string().min(1).max(1500),
    duration_sec: z.number().positive(),
  })).max(40),
  voiceover_text: z.string().max(12000),
  hashtags: z.array(z.string().max(60)).max(15),
  characters: z.array(z.object({ name: z.string(), description: z.string() })).optional(),
});

const scriptTool: Anthropic.Tool = {
  name: "submit_video_plan",
  description: "Submit the complete structured video plan.",
  input_schema: {
    type: "object",
    properties: {
      safe: { type: "boolean", description: "false if the request asks for prohibited content (sexual content involving minors, non-consensual intimate imagery, targeted harassment, violent threats, fraudulent impersonation of real people, etc.)" },
      refusal_reason: { type: "string" },
      title: { type: "string" },
      summary: { type: "string" },
      hook: { type: "string", description: "Opening line that grabs attention in the first 3 seconds" },
      scenes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            scene_number: { type: "integer" },
            narration: { type: "string", description: "What the narrator says during this scene" },
            visual_prompt: { type: "string", description: "Self-contained prompt for a text-to-video model: subject, action, setting, camera, lighting, style. No text overlays, no real people's names." },
            duration_sec: { type: "number" },
          },
          required: ["scene_number", "narration", "visual_prompt", "duration_sec"],
        },
      },
      voiceover_text: { type: "string", description: "Full narration, the scene narrations joined in order" },
      hashtags: { type: "array", items: { type: "string" } },
      characters: { type: "array", items: { type: "object", properties: { name: { type: "string" }, description: { type: "string" } }, required: ["name", "description"] } },
    },
    required: ["safe", "title", "summary", "hook", "scenes", "voiceover_text", "hashtags"],
  },
};

export class AnthropicTextProvider implements TextGenerationProvider {
  readonly name = "anthropic";
  readonly model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
  private client = new Anthropic({ apiKey: requireEnv("ANTHROPIC_API_KEY") });

  async generateScript(req: ScriptRequest): Promise<VideoScript> {
    const wordsPerSecond = 2.4;
    const system = `You are a senior video producer and scriptwriter for ClipForge AI. You turn a user's brief into a production-ready plan for an AI video pipeline.
Rules:
- Produce exactly ${req.sceneCount} scenes. Each scene's duration_sec must be one of: ${req.clipLengths.join(", ")}. Scene durations must sum to about ${req.durationSec} seconds.
- Narration for each scene must be speakable in its duration (about ${wordsPerSecond} words per second).
- Every visual_prompt must stand alone (the video model sees one prompt at a time), describe motion and camera, match the "${req.style}" style and a ${req.aspectRatio} frame, and keep recurring characters visually consistent by restating their appearance.
- Never put readable text, logos or real, identifiable people in visual prompts.
- Write narration in ${req.language}.
- If the brief requests prohibited content, set safe=false, explain in refusal_reason, and return empty scenes.`;
    const user = [
      `Mode: ${req.mode}`,
      req.category && `Category: ${req.category}`,
      req.platform && `Platform: ${req.platform}`,
      req.audience && `Audience: ${req.audience}`,
      req.tone && `Narrator tone: ${req.tone}`,
      req.cta && `End with this call to action: ${req.cta}`,
      req.customInstructions && `Additional instructions: ${req.customInstructions}`,
      `Brief:\n${req.prompt}`,
    ].filter(Boolean).join("\n");

    let lastError = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await this.client.messages.create({
        model: this.model,
        max_tokens: 8000,
        system,
        tools: [scriptTool],
        tool_choice: { type: "tool", name: scriptTool.name },
        messages: [{ role: "user", content: attempt === 0 ? user : `${user}\n\nYour previous output was invalid: ${lastError}. Fix it.` }],
      });
      const block = res.content.find((b) => b.type === "tool_use");
      const parsed = scriptSchema.safeParse(block && "input" in block ? block.input : null);
      if (parsed.success) return normalizeScript(parsed.data, req);
      lastError = parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    }
    throw new Error(`Script output failed validation: ${lastError}`);
  }

  async enhancePrompt(prompt: string, mode: string): Promise<string> {
    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: 800,
      system: "You improve video briefs for an AI video generator. Keep the user's intent, topic and any specifics. Add a clear hook, scene ideas, visual style cues and pacing. Return only the improved brief as plain text, under 180 words. Do not add prohibited content.",
      messages: [{ role: "user", content: `Mode: ${mode}\nBrief: ${prompt}` }],
    });
    const text = res.content.filter((b) => b.type === "text").map((b) => ("text" in b ? b.text : "")).join("").trim();
    if (!text) throw new Error("Empty enhancement");
    return text;
  }
}

/** Snap scene durations to supported clip lengths and renumber. */
export function normalizeScript(script: z.infer<typeof scriptSchema>, req: Pick<ScriptRequest, "clipLengths">): VideoScript {
  const scenes = script.scenes.map((s, i) => ({
    ...s,
    scene_number: i + 1,
    duration_sec: req.clipLengths.reduce((best, len) => (Math.abs(len - s.duration_sec) < Math.abs(best - s.duration_sec) ? len : best), req.clipLengths[0]),
  }));
  return { ...script, scenes };
}
