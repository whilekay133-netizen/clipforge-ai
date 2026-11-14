import { cn } from "@/lib/utils";
import { SceneArt, SCENE_VARIANTS, type SceneVariant } from "./scene-art";

function Frame({ variant }: { variant: SceneVariant }) {
  return (
    <div className="relative aspect-video h-full shrink-0 overflow-hidden rounded-md border border-white/10">
      <SceneArt variant={variant} animated={false} />
    </div>
  );
}

function Row({ order, direction }: { order: SceneVariant[]; direction: "left" | "right" }) {
  const frames = [...order, ...order]; // duplicated for a seamless loop
  return (
    <div className="relative overflow-hidden bg-black/60 py-2">
      <div className="absolute inset-x-0 top-0.5 h-1.5 bg-[repeating-linear-gradient(90deg,transparent_0_10px,rgb(255_255_255/0.18)_10px_16px)]" />
      <div className="absolute inset-x-0 bottom-0.5 h-1.5 bg-[repeating-linear-gradient(90deg,transparent_0_10px,rgb(255_255_255/0.18)_10px_16px)]" />
      <div className={cn("flex h-20 w-max gap-2 px-1 py-1.5 md:h-24", direction === "left" ? "animate-marquee-left" : "animate-marquee-right")}>
        {frames.map((v, i) => <Frame key={i} variant={v} />)}
      </div>
    </div>
  );
}

/** Rows of film frames sliding past, used as a decorative "reel" background. */
export function FilmStrip({ rows = 2, className }: { rows?: number; className?: string }) {
  const base = [...SCENE_VARIANTS, ...SCENE_VARIANTS];
  return (
    <div className={cn("pointer-events-none flex flex-col gap-6", className)} aria-hidden>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className={r % 2 ? "-rotate-2" : "rotate-2"}>
          <Row order={[...base.slice(r * 2), ...base.slice(0, r * 2)]} direction={r % 2 ? "right" : "left"} />
        </div>
      ))}
    </div>
  );
}
