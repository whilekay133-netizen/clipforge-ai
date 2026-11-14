"use client";
import { useEffect, useState } from "react";
import { Loader2, Pause, Play, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SceneArt, type SceneVariant } from "./scene-art";

export interface PlayerScene { variant: SceneVariant; caption: string }

const DEFAULT_SCENES: PlayerScene[] = [
  { variant: "dusk", caption: "Every great story starts with a single idea…" },
  { variant: "city", caption: "ClipForge writes the script and plans each scene." },
  { variant: "ocean", caption: "Visuals, voiceover and subtitles — generated for you." },
  { variant: "space", caption: "Then it renders a video you can publish today." },
];

const RATIO_CLASS: Record<string, string> = { "16:9": "aspect-video", "9:16": "aspect-[9/16]", "1:1": "aspect-square" };
const SCENE_MS = 3200;

function timecode(ms: number) {
  const s = Math.floor(ms / 1000);
  return `00:${String(s).padStart(2, "0")}`;
}

export function LivePlayer({
  scenes = DEFAULT_SCENES,
  aspectRatio = "16:9",
  label,
  rendering = false,
  showControls = true,
  className,
}: {
  scenes?: PlayerScene[];
  aspectRatio?: string;
  label?: string;
  rendering?: boolean;
  showControls?: boolean;
  className?: string;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const total = scenes.length * SCENE_MS;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!playing || reduce) return;
    const t = setInterval(() => setElapsed((e) => (e + 100) % total), 100);
    return () => clearInterval(t);
  }, [playing, total]);

  const idx = Math.min(scenes.length - 1, Math.floor(elapsed / SCENE_MS));
  const progress = (elapsed / total) * 100;

  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl", RATIO_CLASS[aspectRatio] ?? "aspect-video", className)}>
      {scenes.map((s, i) => (
        <div key={i} className={cn("absolute inset-0 transition-opacity duration-700", i === idx ? "opacity-100" : "opacity-0")}>
          <SceneArt variant={s.variant} animated={i === idx && playing} />
        </div>
      ))}

      {/* scanline while rendering */}
      {rendering && <div className="animate-scan pointer-events-none absolute inset-x-0 h-1/3 bg-gradient-to-b from-transparent via-brand-soft/20 to-transparent" />}

      {/* top chips */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-2.5 text-[10px] font-medium text-white">
        <span className="flex items-center gap-1.5 rounded-full bg-black/55 px-2 py-1 backdrop-blur">
          {rendering ? <Loader2 className="h-3 w-3 animate-spin" /> : <span className="animate-pulse-dot h-1.5 w-1.5 rounded-full bg-danger" />}
          {rendering ? `Rendering · scene ${idx + 1}/${scenes.length}` : "PREVIEW"}
        </span>
        {label && <span className="truncate rounded-full bg-black/55 px-2 py-1 backdrop-blur">{label}</span>}
      </div>

      {/* caption */}
      <div className="absolute inset-x-0 bottom-12 flex justify-center px-4">
        <p key={idx} className="animate-caption max-w-[90%] rounded-md bg-black/65 px-2.5 py-1 text-center text-[11px] leading-snug text-white md:text-xs">
          {scenes[idx]?.caption}
        </p>
      </div>

      {/* controls */}
      {showControls && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-3 pb-2.5 pt-6">
          <div className="relative mb-2 flex h-1 gap-0.5">
            {scenes.map((_, i) => (
              <div key={i} className="relative h-full flex-1 overflow-hidden rounded-full bg-white/20">
                <div className="absolute inset-y-0 left-0 bg-brand-soft"
                  style={{ width: `${Math.max(0, Math.min(100, ((elapsed - i * SCENE_MS) / SCENE_MS) * 100))}%` }} />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-white">
            <button type="button" onClick={() => setPlaying(!playing)} aria-label={playing ? "Pause preview" : "Play preview"} className="grid h-6 w-6 place-items-center rounded-full bg-white/15 hover:bg-white/25">
              {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </button>
            <span className="font-mono text-[10px] tabular-nums text-white/80">{timecode(elapsed)} / {timecode(total)}</span>
            <div className="ml-auto flex h-4 items-end gap-[2px]" aria-hidden>
              {Array.from({ length: 14 }).map((_, i) => (
                <span key={i} className={cn("w-[2px] rounded-full bg-accent", playing && "animate-wavebar")}
                  style={{ height: `${30 + ((i * 37) % 70)}%`, animationDelay: `${(i % 7) * 0.12}s` }} />
              ))}
            </div>
            <Volume2 className="h-3.5 w-3.5 text-white/70" />
          </div>
        </div>
      )}
      <span className="sr-only">Animated preview, {Math.round(progress)}% played</span>
    </div>
  );
}
