import { cn } from "@/lib/utils";

export type SceneVariant = "dusk" | "city" | "ocean" | "forest" | "space" | "desert";

export const SCENE_VARIANTS: SceneVariant[] = ["dusk", "city", "ocean", "forest", "space", "desert"];

// Deterministic "random" positions so server and client render identically.
const STARS = Array.from({ length: 22 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  top: (i * 23 + 7) % 55,
  delay: (i % 7) * 0.35,
  size: i % 5 === 0 ? 2 : 1,
}));

const SKY: Record<SceneVariant, string> = {
  dusk: "linear-gradient(180deg,#1b2347 0%,#5b3a94 55%,#f59e6b 100%)",
  city: "linear-gradient(180deg,#050816 0%,#0f1b4d 60%,#3b2a7a 100%)",
  ocean: "linear-gradient(180deg,#1e1b4b 0%,#9d4edd 45%,#fda4af 75%,#fde68a 100%)",
  forest: "linear-gradient(180deg,#020617 0%,#0b2e2b 60%,#14532d 100%)",
  space: "radial-gradient(120% 90% at 70% 30%,#312e81 0%,#0b0b2b 55%,#020617 100%)",
  desert: "linear-gradient(180deg,#431407 0%,#c2410c 45%,#fbbf24 100%)",
};

/** Repeating path (period 160) so a 200%-wide layer can drift seamlessly. */
function Layer({ d, fill, className }: { d: string; fill: string; className?: string }) {
  return (
    <div className={cn("absolute inset-x-0 bottom-0 h-full w-[200%]", className)}>
      <svg viewBox="0 0 320 90" preserveAspectRatio="none" className="h-full w-full" aria-hidden>
        <path d={d} fill={fill} />
      </svg>
    </div>
  );
}

const MOUNTAINS_FAR = "M0 62 L20 46 L40 56 L60 36 L80 52 L100 42 L120 55 L140 34 L160 62 L180 46 L200 56 L220 36 L240 52 L260 42 L280 55 L300 34 L320 62 L320 90 L0 90Z";
const MOUNTAINS_NEAR = "M0 74 L25 60 L50 70 L75 56 L105 72 L130 62 L160 74 L185 60 L210 70 L235 56 L265 72 L290 62 L320 74 L320 90 L0 90Z";
const WAVES_1 = "M0 68 Q20 63 40 68 T80 68 T120 68 T160 68 T200 68 T240 68 T280 68 T320 68 L320 90 L0 90Z";
const WAVES_2 = "M0 76 Q20 71 40 76 T80 76 T120 76 T160 76 T200 76 T240 76 T280 76 T320 76 L320 90 L0 90Z";
const DUNES_FAR = "M0 66 Q40 52 80 64 T160 66 Q200 52 240 64 T320 66 L320 90 L0 90Z";
const DUNES_NEAR = "M0 78 Q50 64 100 76 T160 78 Q210 64 260 76 T320 78 L320 90 L0 90Z";
const PINES = (() => {
  let d = "";
  for (let i = 0; i < 16; i++) {
    const x = i * 20 + (i % 2) * 4;
    const h = 22 + ((i * 7) % 12);
    d += `M${x} 90 L${x + 7} ${90 - h} L${x + 14} 90Z `;
  }
  return d;
})();
const BUILDINGS = (() => {
  const widths = [14, 10, 18, 12, 16, 9, 20, 13, 11, 17];
  const heights = [40, 28, 52, 34, 46, 24, 58, 38, 30, 44];
  let d = "";
  let x = 0;
  for (let rep = 0; rep < 2; rep++) {
    x = rep * 160;
    widths.forEach((w, i) => {
      d += `M${x} 90 L${x} ${90 - heights[i]} L${x + w} ${90 - heights[i]} L${x + w} 90Z `;
      x += w + 2;
    });
  }
  return d;
})();

export function SceneArt({ variant, className, animated = true }: { variant: SceneVariant; className?: string; animated?: boolean }) {
  const drift = animated ? "animate-drift" : "";
  const driftFast = animated ? "animate-drift-fast" : "";
  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)} aria-hidden>
      <div className={cn("absolute inset-0", animated && "animate-kenburns")} style={{ background: SKY[variant] }}>
        {(variant === "city" || variant === "space" || variant === "forest" || variant === "dusk") &&
          STARS.map((s, i) => (
            <span key={i} className={cn("absolute rounded-full bg-white", animated && "animate-twinkle")}
              style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s` }} />
          ))}

        {variant === "dusk" && (
          <>
            <div className={cn("absolute left-[58%] top-[38%] h-[22%] aspect-square rounded-full bg-[#fcd34d] shadow-[0_0_40px_10px_rgb(252_211_77/0.45)]", animated && "animate-bob")} />
            <Layer d={MOUNTAINS_FAR} fill="#3b2a6b" className={drift} />
            <Layer d={MOUNTAINS_NEAR} fill="#1e1640" className={driftFast} />
          </>
        )}
        {variant === "city" && (
          <>
            <div className="absolute left-[18%] top-[16%] h-[14%] aspect-square rounded-full bg-[#e0e7ff] shadow-[0_0_30px_6px_rgb(224_231_255/0.35)]" />
            <Layer d={BUILDINGS} fill="#0b1235" className={drift} />
            <div className={cn("absolute inset-x-0 bottom-0 h-[55%] w-[200%] opacity-80", drift)}
              style={{ backgroundImage: "radial-gradient(circle, #fcd34d 0.8px, transparent 1.2px)", backgroundSize: "7px 6px", maskImage: "linear-gradient(to top, black 60%, transparent)" }} />
            <Layer d={MOUNTAINS_NEAR} fill="#050816" className={driftFast} />
          </>
        )}
        {variant === "ocean" && (
          <>
            <div className={cn("absolute left-[40%] top-[48%] h-[24%] aspect-square rounded-full bg-[#fef3c7] shadow-[0_0_50px_14px_rgb(254_243_199/0.5)]", animated && "animate-bob")} />
            <Layer d={WAVES_1} fill="#6d28d9" className={drift} />
            <Layer d={WAVES_2} fill="#312e81" className={driftFast} />
          </>
        )}
        {variant === "forest" && (
          <>
            <div className="absolute right-[18%] top-[14%] h-[16%] aspect-square rounded-full bg-[#ecfccb] shadow-[0_0_30px_8px_rgb(236_252_203/0.35)]" />
            <Layer d={PINES} fill="#0f3d2e" className={drift} />
            <Layer d={MOUNTAINS_NEAR} fill="#052016" className={driftFast} />
            {animated && [12, 34, 58, 76, 88].map((l, i) => (
              <span key={l} className="animate-rise absolute bottom-[10%] h-1 w-1 rounded-full bg-[#bef264] shadow-[0_0_6px_2px_rgb(190_242_100/0.7)]"
                style={{ left: `${l}%`, animationDelay: `${i * 1.1}s` }} />
            ))}
          </>
        )}
        {variant === "space" && (
          <>
            <div className={cn("absolute left-[52%] top-[24%] h-[46%] aspect-square rounded-full bg-[radial-gradient(circle_at_30%_30%,#a78bfa,#4c1d95_60%,#1e1b4b)]", animated && "animate-bob")} />
            <div className="absolute left-[44%] top-[42%] h-[10%] w-[40%] -rotate-12 rounded-[50%] border-2 border-[#c4b5fd]/60" />
            <div className="absolute left-[14%] top-[62%] h-[8%] aspect-square rounded-full bg-[#22d3ee]/80 shadow-[0_0_20px_4px_rgb(34_211_238/0.4)]" />
          </>
        )}
        {variant === "desert" && (
          <>
            <div className={cn("absolute left-[30%] top-[22%] h-[26%] aspect-square rounded-full bg-[#fff7ed] shadow-[0_0_60px_18px_rgb(255_247_237/0.5)]", animated && "animate-bob")} />
            <Layer d={DUNES_FAR} fill="#b45309" className={drift} />
            <Layer d={DUNES_NEAR} fill="#78350f" className={driftFast} />
          </>
        )}
      </div>
      {/* cinematic vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_40%,transparent_55%,rgb(0_0_0/0.55))]" />
    </div>
  );
}
