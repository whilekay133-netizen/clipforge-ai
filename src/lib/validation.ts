import { z } from "zod";
import { MODES, VIDEO_CAPABILITIES, VISUAL_STYLES, VOICES, PLATFORM_PRESETS } from "./catalog";

const modeIds = MODES.map((m) => m.id) as [string, ...string[]];

export const generationSettingsSchema = z.object({
  durationSec: z.number().int().positive(),
  aspectRatio: z.enum(VIDEO_CAPABILITIES.aspectRatios),
  quality: z.enum(["hd"]).default("hd"),
  style: z.string().refine((s) => VISUAL_STYLES.includes(s), "Unsupported visual style"),
  voice: z.object({
    enabled: z.boolean(),
    voiceId: z.string().optional().refine((v) => !v || VOICES.some((x) => x.id === v), "Unsupported voice"),
    speed: z.number().min(0.7).max(1.2).default(1),
    language: z.string().max(40).default("English"),
    tone: z.string().max(40).default("Neutral"),
  }),
  subtitles: z.object({
    enabled: z.boolean(),
    position: z.enum(["bottom", "middle", "top"]).default("bottom"),
    size: z.enum(["sm", "md", "lg"]).default("md"),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#ffffff"),
  }),
  music: z.literal("none").default("none"),
  platform: z.string().optional().refine((p) => !p || PLATFORM_PRESETS.some((x) => x.id === p), "Unknown platform"),
  audience: z.string().max(120).optional(),
  language: z.enum(["English", "Spanish", "French", "Hindi"]).default("English"),
  sceneCount: z.number().int().min(1).max(36).nullable().optional(),
  cta: z.string().max(160).optional(),
  customInstructions: z.string().max(1000).optional(),
  templateId: z.string().max(60).optional(),
});

export const createGenerationSchema = z
  .object({
    mode: z.enum(modeIds),
    title: z.string().trim().max(120).optional(),
    category: z.string().max(40).optional(),
    prompt: z.string().trim().min(10, "Describe your video in at least 10 characters").max(4000),
    enhancedPrompt: z.string().trim().max(6000).optional(),
    settings: generationSettingsSchema,
    projectId: z.string().uuid().optional(),
  })
  .superRefine((val, ctx) => {
    const mode = MODES.find((m) => m.id === val.mode)!;
    if (!mode.available) ctx.addIssue({ code: "custom", path: ["mode"], message: `${mode.name} is not available yet` });
    if (!mode.durations.includes(val.settings.durationSec))
      ctx.addIssue({ code: "custom", path: ["settings", "durationSec"], message: `Duration not supported for ${mode.name}` });
    if (!mode.usesScript && val.settings.voice.enabled)
      ctx.addIssue({ code: "custom", path: ["settings", "voice"], message: "Voiceover is not available for single-clip text-to-video" });
  });

export type CreateGenerationInput = z.infer<typeof createGenerationSchema>;

export const estimateSchema = z.object({
  mode: z.enum(modeIds),
  settings: z.object({
    durationSec: z.number().int().positive(),
    voice: z.object({ enabled: z.boolean() }),
    quality: z.string().optional(),
  }),
});

export const updateProjectSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(1000).optional(),
  subtitles: z.array(z.object({ start: z.number().min(0), end: z.number().min(0), text: z.string().max(500) })).max(2000).optional(),
});

export const profileUpdateSchema = z.object({ full_name: z.string().trim().min(1).max(120) });

export const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  subject: z.string().trim().max(200).optional().default(""),
  message: z.string().trim().min(10).max(5000),
});
