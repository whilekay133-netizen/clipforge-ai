"use client";
import { useEffect, useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { LivePlayer } from "@/components/motion/live-player";
import { cn } from "@/lib/utils";

const STAGES = ["Script & scene plan", "Scenes generated", "Voiceover + subtitles", "Assemble & render", "Ready to download"];

export function ProductPreview() {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setStage(2); return; }
    const t = setInterval(() => setStage((s) => (s + 1) % (STAGES.length + 1)), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative mx-auto max-w-5xl text-left">
      <div className="absolute -inset-x-10 -top-10 -bottom-10 -z-10 rounded-[40px] bg-gradient-to-b from-brand/25 via-brand/5 to-transparent blur-3xl" />
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-danger/70" /><span className="h-2.5 w-2.5 rounded-full bg-warning/70" /><span className="h-2.5 w-2.5 rounded-full bg-success/70" />
          <span className="ml-3 text-xs text-muted">clipforge.ai/dashboard/create</span>
        </div>
        <div className="grid md:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col justify-center space-y-4 border-b border-border p-6 md:border-r md:border-b-0">
            <div className="text-xs uppercase tracking-wide text-muted">Faceless video · 60 s · 16:9</div>
            <div className="rounded-xl border border-border bg-surface-2/70 p-4 text-sm leading-relaxed">
              Explain why the Great Wall of China isn&apos;t visible from space. Open with the myth, use cinematic drone shots, end with a question for viewers.
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {["Cinematic", "Voice: Michael", "Subtitles on", "English"].map((t) => <span key={t} className="rounded-full border border-border px-2.5 py-1 text-muted">{t}</span>)}
            </div>
            <ol className="space-y-2 text-sm">
              {STAGES.map((s, i) => {
                const state = i < stage ? "done" : i === stage ? "active" : "todo";
                return (
                  <li key={s} className="flex items-center gap-3 transition-opacity">
                    {state === "done" && <span className="grid h-5 w-5 place-items-center rounded-full bg-success/20 text-success"><Check className="h-3 w-3" /></span>}
                    {state === "active" && <Loader2 className="h-5 w-5 animate-spin text-brand-soft" />}
                    {state === "todo" && <span className="h-5 w-5 rounded-full border border-border" />}
                    <span className={cn(state === "todo" && "text-muted", state === "active" && "text-brand-soft")}>{s}</span>
                  </li>
                );
              })}
            </ol>
            <div className="flex items-center justify-between rounded-xl border border-brand/30 bg-brand/10 px-4 py-3 text-sm">
              <span className="flex items-center gap-2 text-brand-soft"><Sparkles className="h-4 w-4" /> Estimated cost</span>
              <span className="font-semibold">77 credits</span>
            </div>
          </div>
          <div className="flex items-center justify-center bg-black/30 p-5">
            <LivePlayer aspectRatio="16:9" label="Cinematic · 1080p" rendering={stage < STAGES.length - 1} className="w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
