// Client-safe catalog of creation options. Contains NO prices — credit estimates come from the server.
import type { CreationMode, ProjectStatus } from "./types";

export interface ModeDef {
  id: CreationMode;
  name: string;
  description: string;
  available: boolean;
  usesScript: boolean;
  durations: number[]; // seconds the current provider/model pipeline supports
}

/**
 * Capabilities of the configured video pipeline. Scene clips come from a text-to-video model
 * that supports 5s/10s clips and 16:9, 9:16, 1:1 (Kling via fal.ai). 4:5 is hidden until a model that supports it is enabled.
 */
export const VIDEO_CAPABILITIES = {
  aspectRatios: ["16:9", "9:16", "1:1"] as const,
  qualities: [{ id: "hd", label: "HD (model default, up to 1080p)" }] as const,
  clipLengths: [5, 10] as const,
};

export const SCRIPTED_DURATIONS = [5, 15, 30, 60, 90, 120, 180];

export const MODES: ModeDef[] = [
  { id: "faceless", name: "Faceless video", description: "Topic in, narrated video out: script, scenes, voiceover and subtitles.", available: true, usesScript: true, durations: SCRIPTED_DURATIONS },
  { id: "social", name: "Social media video", description: "Platform presets for Shorts, TikTok, Reels, YouTube, Facebook and LinkedIn.", available: true, usesScript: true, durations: [5, 15, 30, 60, 90] },
  { id: "storytelling", name: "AI storytelling", description: "Title, story, characters and scenes narrated as a short film.", available: true, usesScript: true, durations: SCRIPTED_DURATIONS },
  { id: "text_to_video", name: "Text-to-video", description: "Describe one shot and get a single generated clip.", available: true, usesScript: false, durations: [5, 10] },
  { id: "image_to_video", name: "Image-to-video", description: "Animate an uploaded image with camera movement.", available: false, usesScript: false, durations: [5, 10] },
  { id: "product_ad", name: "Product advertisement", description: "Turn product images and details into a promo.", available: false, usesScript: true, durations: [15, 30] },
];

export const PLATFORM_PRESETS = [
  { id: "youtube", name: "YouTube", aspectRatio: "16:9", guidance: "60 s – 3 min" },
  { id: "youtube_shorts", name: "YouTube Shorts", aspectRatio: "9:16", guidance: "15 – 60 s" },
  { id: "tiktok", name: "TikTok", aspectRatio: "9:16", guidance: "15 – 60 s" },
  { id: "instagram_reels", name: "Instagram Reels", aspectRatio: "9:16", guidance: "15 – 90 s" },
  { id: "facebook", name: "Facebook", aspectRatio: "1:1", guidance: "15 – 60 s" },
  { id: "linkedin", name: "LinkedIn", aspectRatio: "1:1", guidance: "30 – 90 s" },
];

export const VISUAL_STYLES = [
  "Cinematic", "Realistic", "3D animation", "Cartoon", "Anime", "Documentary",
  "Minimalist", "Corporate", "Educational", "Artistic", "Fantasy", "Photorealistic",
];

export const CATEGORIES = ["Motivation", "Education", "Facts", "History", "Business", "Documentary", "Storytelling", "Inspirational", "Marketing", "Other"];

// Kokoro voices on fal.ai (English). Other narration languages use that language's default voice.
export const VOICES = [
  { id: "af_heart", name: "Heart", gender: "Female", accent: "American, warm" },
  { id: "af_bella", name: "Bella", gender: "Female", accent: "American, bright" },
  { id: "af_nicole", name: "Nicole", gender: "Female", accent: "American, soft" },
  { id: "am_michael", name: "Michael", gender: "Male", accent: "American, steady" },
  { id: "am_adam", name: "Adam", gender: "Male", accent: "American, clear" },
  { id: "am_onyx", name: "Onyx", gender: "Male", accent: "American, deep" },
  { id: "bf_emma", name: "Emma", gender: "Female", accent: "British" },
  { id: "bm_george", name: "George", gender: "Male", accent: "British" },
];

export const VOICE_LANGUAGES = [
  { name: "English", code: "en", endpoint: "fal-ai/kokoro/american-english", defaultVoice: "af_heart" },
  { name: "Spanish", code: "es", endpoint: "fal-ai/kokoro/spanish", defaultVoice: "ef_dora" },
  { name: "French", code: "fr", endpoint: "fal-ai/kokoro/french", defaultVoice: "ff_siwis" },
  { name: "Hindi", code: "hi", endpoint: "fal-ai/kokoro/hindi", defaultVoice: "hf_alpha" },
];

export const LANGUAGES = VOICE_LANGUAGES.map((l) => l.name);

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  draft: "Draft",
  queued: "Queued",
  processing: "Processing",
  generating_script: "Generating script",
  generating_scenes: "Generating scenes",
  generating_voiceover: "Generating voiceover",
  assembling_video: "Assembling video",
  rendering: "Rendering",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

export const PIPELINE_STAGES: ProjectStatus[] = [
  "queued", "generating_script", "generating_scenes", "generating_voiceover", "assembling_video", "rendering", "completed",
];

export const ACTIVE_STATUSES: ProjectStatus[] = ["queued", "processing", "generating_script", "generating_scenes", "generating_voiceover", "assembling_video", "rendering"];

export function statusTone(status: ProjectStatus): "success" | "danger" | "warning" | "neutral" | "info" {
  if (status === "completed") return "success";
  if (status === "failed") return "danger";
  if (status === "cancelled") return "warning";
  if (status === "draft") return "neutral";
  return "info";
}

export const TEMPLATES = [
  { id: "facts-shorts", name: "5 mind-blowing facts", mode: "social" as CreationMode, category: "Facts", style: "Cinematic", durationSec: 30, aspectRatio: "9:16", platform: "youtube_shorts",
    prompt: "Five surprising facts about the deep ocean, each with a striking visual. Open with a hook question, end with a call to follow for more." },
  { id: "history-doc", name: "History mini-documentary", mode: "faceless" as CreationMode, category: "History", style: "Documentary", durationSec: 90, aspectRatio: "16:9",
    prompt: "The rise and fall of the Benin Kingdom's bronze-casting guilds, told chronologically with archival-style visuals and a measured narrator." },
  { id: "motivation", name: "Morning motivation", mode: "faceless" as CreationMode, category: "Motivation", style: "Cinematic", durationSec: 60, aspectRatio: "9:16",
    prompt: "A motivational piece about consistency beating talent, with sunrise runners, city timelapses and a strong closing line." },
  { id: "explainer", name: "Business explainer", mode: "faceless" as CreationMode, category: "Business", style: "Minimalist", durationSec: 60, aspectRatio: "16:9",
    prompt: "Explain how compound interest works using a simple savings example, clean minimalist visuals, and a friendly educational tone." },
  { id: "bedtime-story", name: "Animated bedtime story", mode: "storytelling" as CreationMode, category: "Storytelling", style: "3D animation", durationSec: 120, aspectRatio: "16:9",
    prompt: "A gentle story about a small firefly who is afraid of the dark and learns to shine, for children aged 4–8." },
  { id: "product-teaser", name: "Product teaser", mode: "social" as CreationMode, category: "Marketing", style: "Corporate", durationSec: 15, aspectRatio: "1:1", platform: "linkedin",
    prompt: "A sleek teaser for a smart reusable water bottle that tracks hydration. Highlight design, the app, and end with 'Pre-order today'." },
];
