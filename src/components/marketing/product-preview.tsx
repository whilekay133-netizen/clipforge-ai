import { Check, Loader2, Sparkles } from "lucide-react";

const stages = [
  { label: "Script & scene plan", state: "done" },
  { label: "Scenes 1–6 generated", state: "done" },
  { label: "Voiceover + subtitles", state: "active" },
  { label: "Assemble & render", state: "todo" },
];

export function ProductPreview() {
  return (
    <div className="relative mx-auto max-w-5xl text-left">
      <div className="absolute -inset-x-10 -top-10 -bottom-10 -z-10 rounded-[40px] bg-gradient-to-b from-brand/25 via-brand/5 to-transparent blur-3xl" />
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-danger/70" /><span className="h-2.5 w-2.5 rounded-full bg-warning/70" /><span className="h-2.5 w-2.5 rounded-full bg-success/70" />
          <span className="ml-3 text-xs text-muted">clipforge.ai/dashboard/create</span>
        </div>
        <div className="grid gap-0 md:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col justify-center space-y-4 border-b border-border p-6 md:border-r md:border-b-0">
            <div className="text-xs uppercase tracking-wide text-muted">Faceless video · 60 s · 9:16</div>
            <div className="rounded-xl border border-border bg-surface-2/70 p-4 text-sm leading-relaxed">
              Explain why the Great Wall of China isn&apos;t visible from space. Open with the myth, use cinematic drone shots, end with a question for viewers.
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {["Cinematic", "Voice: Michael", "Subtitles on", "English"].map((t) => <span key={t} className="rounded-full border border-border px-2.5 py-1 text-muted">{t}</span>)}
            </div>
            <div className="flex items-center justify-between rounded-xl border border-brand/30 bg-brand/10 px-4 py-3 text-sm">
              <span className="flex items-center gap-2 text-brand-soft"><Sparkles className="h-4 w-4" /> Estimated cost</span>
              <span className="font-semibold">129 credits</span>
            </div>
          </div>
          <div className="flex flex-col gap-5 p-6">
            <div className="relative mx-auto aspect-[9/16] w-40 overflow-hidden rounded-xl border border-border bg-gradient-to-b from-[#1b2347] via-[#2a1f4f] to-[#0b1022]">
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute inset-x-3 bottom-6 rounded bg-black/60 px-2 py-1 text-center text-[10px] leading-tight text-white">Here&apos;s the truth about the Great Wall…</div>
              <svg viewBox="0 0 100 60" className="absolute left-0 right-0 top-1/3 w-full opacity-70"><path d="M0 45 L15 38 L28 42 L40 30 L55 36 L70 24 L85 32 L100 26 L100 60 L0 60Z" fill="#3b2f73" /><path d="M0 50 L20 44 L35 47 L50 40 L65 44 L80 37 L100 41 L100 60 L0 60Z" fill="#241c4b" /></svg>
            </div>
            <ol className="space-y-2.5 text-sm">
              {stages.map((s) => (
                <li key={s.label} className="flex items-center gap-3">
                  {s.state === "done" && <span className="grid h-5 w-5 place-items-center rounded-full bg-success/20 text-success"><Check className="h-3 w-3" /></span>}
                  {s.state === "active" && <Loader2 className="h-5 w-5 animate-spin text-brand-soft" />}
                  {s.state === "todo" && <span className="h-5 w-5 rounded-full border border-border" />}
                  <span className={s.state === "todo" ? "text-muted" : ""}>{s.label}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
