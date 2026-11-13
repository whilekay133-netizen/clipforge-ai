export type ProjectStatus =
  | "draft" | "queued" | "processing" | "generating_script" | "generating_scenes"
  | "generating_voiceover" | "assembling_video" | "rendering" | "completed" | "failed" | "cancelled";

export type CreationMode = "faceless" | "text_to_video" | "image_to_video" | "social" | "storytelling" | "product_ad";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: "user" | "admin";
  account_status: "active" | "suspended";
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_minor: number;
  currency: string;
  billing_interval: "month" | "one_time";
  monthly_credits: number;
  limits: { max_duration_sec?: number; watermark?: boolean; history_days?: number | null; storage_mb?: number };
  features: string[];
  sort_order: number;
  is_active: boolean;
}

export interface Wallet { user_id: string; available: number; reserved: number; updated_at: string }

export interface SubtitleCue { start: number; end: number; text: string }

export interface ScriptScene { scene_number: number; narration: string; visual_prompt: string; duration_sec: number }
export interface VideoScript {
  safe: boolean;
  refusal_reason?: string;
  title: string;
  summary: string;
  hook: string;
  scenes: ScriptScene[];
  voiceover_text: string;
  hashtags: string[];
  characters?: { name: string; description: string }[];
}

export interface ProjectSettings {
  durationSec: number;
  aspectRatio: string;
  quality: string;
  style: string;
  voice: { enabled: boolean; voiceId?: string; speed?: number; language?: string; tone?: string };
  subtitles: { enabled: boolean; position: "bottom" | "middle" | "top"; size: "sm" | "md" | "lg"; color: string };
  music: "none";
  platform?: string;
  audience?: string;
  language?: string;
  sceneCount?: number | null;
  cta?: string;
  customInstructions?: string;
  templateId?: string;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description: string;
  mode: CreationMode;
  category: string | null;
  prompt: string;
  enhanced_prompt: string | null;
  settings: ProjectSettings;
  status: ProjectStatus;
  status_message: string | null;
  script: VideoScript | null;
  subtitles: SubtitleCue[] | null;
  thumbnail_path: string | null;
  final_video_path: string | null;
  voiceover_path: string | null;
  duration_sec: number | null;
  aspect_ratio: string | null;
  resolution: string | null;
  created_at: string;
  updated_at: string;
}

export interface Scene {
  id: string;
  project_id: string;
  scene_number: number;
  script: string;
  visual_prompt: string;
  duration_sec: number;
  status: "pending" | "submitted" | "completed" | "failed";
  provider_request_id: string | null;
  asset_path: string | null;
  error: string | null;
  attempts: number;
}

export interface Generation {
  id: string;
  project_id: string;
  user_id: string;
  status: ProjectStatus;
  stage: string | null;
  estimated_credits: number;
  actual_credits: number | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
  video_model: string | null;
  render_request_id: string | null;
}
