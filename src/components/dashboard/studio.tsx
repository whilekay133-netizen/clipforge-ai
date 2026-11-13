"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Clapperboard, Coins, ImageIcon, Info, Loader2, Lock, Megaphone, Smartphone, Sparkles, Type, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { CATEGORIES, LANGUAGES, MODES, PLATFORM_PRESETS, TEMPLATES, VIDEO_CAPABILITIES, VISUAL_STYLES, VOICES } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import type { CreationMode, ProjectSettings } from "@/lib/types";

const MODE_ICONS: Record<CreationMode, typeof Clapperboard> = {
  faceless: Clapperboard, social: Smartphone, storytelling: BookOpen, text_to_video: Type, image_to_video: ImageIcon, product_ad: Megaphone,
};

interface Estimate { total: number; available: number; sufficient: boolean; breakdown: { label: string; credits: number }[] }

function label(sec: number) {
  return sec < 60 ? `${sec} sec` : sec % 60 === 0 ? `${sec / 60} min` : `${sec}s`;
}

export function Studio({ maxDuration, templateId }: { maxDuration: number; templateId?: string }) {
  const router = useRouter();
  const template = TEMPLATES.find((t) => t.id === templateId);

  const [mode, setMode] = useState<CreationMode>(template?.mode ?? "faceless");
  const [title, setTitle] = useState(template?.name ?? "");
  const [category, setCategory] = useState(template?.category ?? "Education");
  const [prompt, setPrompt] = useState(template?.prompt ?? "");
  const [enhanced, setEnhanced] = useState<string | null>(null);
  const [useEnhanced, setUseEnhanced] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [settings, setSettings] = useState<ProjectSettings>({
    durationSec: template?.durationSec ?? 30,
    aspectRatio: template?.aspectRatio ?? "9:16",
    quality: "hd",
    style: template?.style ?? "Cinematic",
    voice: { enabled: true, voiceId: VOICES[0].id, speed: 1, language: "English", tone: "Engaging" },
    subtitles: { enabled: true, position: "bottom", size: "md", color: "#ffffff" },
    music: "none",
    platform: template && "platform" in template ? template.platform : undefined,
    audience: "",
    language: "English",
    sceneCount: null,
    cta: "",
    customInstructions: "",
    templateId: template?.id,
  });
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const idemKey = useRef<string>("");

  const modeDef = MODES.find((m) => m.id === mode)!;
  const set = <K extends keyof ProjectSettings>(k: K, v: ProjectSettings[K]) => setSettings((s) => ({ ...s, [k]: v }));

  // Keep duration valid for the selected mode
  useEffect(() => {
    if (!modeDef.durations.includes(settings.durationSec)) set("durationSec", modeDef.durations.find((d) => d <= maxDuration) ?? modeDef.durations[0]);
    if (!modeDef.usesScript && settings.voice.enabled) setSettings((s) => ({ ...s, voice: { ...s.voice, enabled: false }, subtitles: { ...s.subtitles, enabled: false } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Server-side credit estimate (debounced)
  useEffect(() => {
    const t = setTimeout(async () => {
      setEstimating(true);
      try {
        const res = await fetch("/api/generate/estimate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, settings: { durationSec: settings.durationSec, voice: { enabled: settings.voice.enabled } } }) });
        if (res.ok) setEstimate(await res.json());
      } finally {
        setEstimating(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [mode, settings.durationSec, settings.voice.enabled]);

  async function enhance() {
    setError("");
    setEnhancing(true);
    try {
      const res = await fetch("/api/generate/enhance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, mode }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setEnhanced(body.enhanced);
      setUseEnhanced(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enhancement failed");
    } finally {
      setEnhancing(false);
    }
  }

  async function submit() {
    setError("");
    if (prompt.trim().length < 10) return setError("Describe your video in at least 10 characters.");
    setSubmitting(true);
    if (!idemKey.current) idemKey.current = crypto.randomUUID();
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idemKey.current },
        body: JSON.stringify({
          mode, title: title || undefined, category, prompt,
          enhancedPrompt: useEnhanced && enhanced ? enhanced : undefined,
          settings: { ...settings, audience: settings.audience || undefined, cta: settings.cta || undefined, customInstructions: settings.customInstructions || undefined },
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not start generation");
      router.push(`/dashboard/projects/${body.projectId}`);
    } catch (e) {
      idemKey.current = "";
      setError(e instanceof Error ? e.message : "Could not start generation");
      setSubmitting(false);
    }
  }

  const stylesShown = useMemo(() => VISUAL_STYLES, []);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        {/* Mode */}
        <section>
          <h2 className="mb-3 text-sm font-semibold">1. Choose a creation mode</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MODES.map((m) => {
              const Icon = MODE_ICONS[m.id];
              return (
                <button key={m.id} type="button" disabled={!m.available} onClick={() => setMode(m.id)}
                  className={cn("relative rounded-xl border p-4 text-left transition-colors", mode === m.id ? "border-brand bg-brand/10" : "border-border bg-surface hover:border-brand/40", !m.available && "cursor-not-allowed opacity-50")}>
                  <Icon className={cn("h-5 w-5", mode === m.id ? "text-brand-soft" : "text-muted")} />
                  <p className="mt-2 text-sm font-medium">{m.name}</p>
                  <p className="mt-0.5 text-xs text-muted">{m.description}</p>
                  {!m.available && <span className="absolute right-3 top-3 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted">Coming soon</span>}
                </button>
              );
            })}
          </div>
        </section>

        {/* Prompt */}
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-4 text-sm font-semibold">2. Describe your video</h2>
          <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
            <div><Label htmlFor="title">Title (optional)</Label><Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="We'll suggest one if you leave this blank" maxLength={120} /></div>
            <div><Label htmlFor="category">Category</Label><Select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></div>
          </div>
          <div className="mt-4">
            <Label htmlFor="prompt">Prompt</Label>
            <Textarea id="prompt" value={prompt} onChange={(e) => { setPrompt(e.target.value); setEnhanced(null); setUseEnhanced(false); }} rows={6} maxLength={4000}
              placeholder="Describe the video you want to create. Include the topic, desired scenes, style and any specific instructions." />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted">{prompt.length}/4000</span>
              <Button type="button" variant="secondary" size="sm" onClick={enhance} disabled={enhancing || prompt.trim().length < 5}>
                {enhancing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Enhance with Claude
              </Button>
            </div>
          </div>
          {enhanced && (
            <div className="mt-4 rounded-xl border border-brand/30 bg-brand/5 p-4">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-brand-soft"><Sparkles className="h-3.5 w-3.5" /> Enhanced prompt</span>
                <div className="flex gap-1 rounded-lg border border-border p-0.5">
                  <button type="button" onClick={() => setUseEnhanced(false)} className={cn("rounded-md px-2 py-1", !useEnhanced && "bg-surface-2")}>Use original</button>
                  <button type="button" onClick={() => setUseEnhanced(true)} className={cn("rounded-md px-2 py-1", useEnhanced && "bg-brand text-white")}>Use enhanced</button>
                </div>
              </div>
              <Textarea value={enhanced} onChange={(e) => setEnhanced(e.target.value)} rows={6} className="bg-surface/70" />
              <p className="mt-2 text-xs text-muted">Your original prompt is kept with the project either way.</p>
            </div>
          )}
        </section>

        {/* Settings */}
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-4 text-sm font-semibold">3. Configure</h2>
          <div className="space-y-5">
            {mode === "social" && (
              <div>
                <Label>Platform preset</Label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_PRESETS.map((p) => (
                    <Chip key={p.id} active={settings.platform === p.id} onClick={() => setSettings((s) => ({ ...s, platform: p.id, aspectRatio: p.aspectRatio }))}>
                      {p.name} <span className="text-muted">· {p.aspectRatio} · {p.guidance}</span>
                    </Chip>
                  ))}
                </div>
              </div>
            )}
            <div>
              <Label>Duration</Label>
              <div className="flex flex-wrap gap-2">
                {modeDef.durations.map((d) => (
                  <Chip key={d} active={settings.durationSec === d} disabled={d > maxDuration} onClick={() => set("durationSec", d)} title={d > maxDuration ? "Upgrade your plan for longer videos" : undefined}>
                    {d > maxDuration && <Lock className="h-3 w-3" />}{label(d)}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label>Aspect ratio</Label>
                <div className="flex flex-wrap gap-2">
                  {VIDEO_CAPABILITIES.aspectRatios.map((r) => <Chip key={r} active={settings.aspectRatio === r} onClick={() => set("aspectRatio", r)}><RatioIcon r={r} />{r}</Chip>)}
                </div>
              </div>
              <div>
                <Label>Quality</Label>
                <Select value={settings.quality} onChange={(e) => set("quality", e.target.value)}>{VIDEO_CAPABILITIES.qualities.map((q) => <option key={q.id} value={q.id}>{q.label}</option>)}</Select>
              </div>
            </div>
            <div>
              <Label>Visual style</Label>
              <div className="flex flex-wrap gap-2">{stylesShown.map((s) => <Chip key={s} active={settings.style === s} onClick={() => set("style", s)}>{s}</Chip>)}</div>
            </div>

            {modeDef.usesScript && (
              <div className="grid gap-5 lg:grid-cols-2">
                <fieldset className="rounded-xl border border-border p-4">
                  <Toggle label="Voiceover" checked={settings.voice.enabled} onChange={(v) => set("voice", { ...settings.voice, enabled: v })} />
                  {settings.voice.enabled && (
                    <div className="mt-4 space-y-3">
                      <div><Label>Voice{settings.language !== "English" && <span className="normal-case text-muted"> · {settings.language} uses its native voice</span>}</Label><Select disabled={settings.language !== "English"} value={settings.voice.voiceId} onChange={(e) => set("voice", { ...settings.voice, voiceId: e.target.value })}>{VOICES.map((v) => <option key={v.id} value={v.id}>{v.name} — {v.gender}, {v.accent}</option>)}</Select></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>Tone</Label><Select value={settings.voice.tone} onChange={(e) => set("voice", { ...settings.voice, tone: e.target.value })}>{["Engaging", "Calm", "Energetic", "Authoritative", "Friendly", "Dramatic"].map((t) => <option key={t}>{t}</option>)}</Select></div>
                        <div><Label>Speed · {settings.voice.speed?.toFixed(2)}×</Label><input type="range" min={0.7} max={1.2} step={0.05} value={settings.voice.speed} onChange={(e) => set("voice", { ...settings.voice, speed: Number(e.target.value) })} className="mt-3 w-full accent-[#8b5cf6]" /></div>
                      </div>
                    </div>
                  )}
                </fieldset>
                <fieldset className="rounded-xl border border-border p-4">
                  <Toggle label="Subtitles" checked={settings.subtitles.enabled} disabled={!settings.voice.enabled} onChange={(v) => set("subtitles", { ...settings.subtitles, enabled: v })} />
                  {!settings.voice.enabled && <p className="mt-2 text-xs text-muted">Subtitles are timed to the voiceover.</p>}
                  {settings.subtitles.enabled && settings.voice.enabled && (
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <div><Label>Position</Label><Select value={settings.subtitles.position} onChange={(e) => set("subtitles", { ...settings.subtitles, position: e.target.value as "bottom" })}><option value="bottom">Bottom</option><option value="middle">Middle</option><option value="top">Top</option></Select></div>
                      <div><Label>Size</Label><Select value={settings.subtitles.size} onChange={(e) => set("subtitles", { ...settings.subtitles, size: e.target.value as "md" })}><option value="sm">Small</option><option value="md">Medium</option><option value="lg">Large</option></Select></div>
                      <div><Label>Colour</Label><input type="color" value={settings.subtitles.color} onChange={(e) => set("subtitles", { ...settings.subtitles, color: e.target.value })} className="h-10 w-full cursor-pointer rounded-lg border border-border bg-surface-2" /></div>
                    </div>
                  )}
                </fieldset>
              </div>
            )}

            <div>
              <Label>Music</Label>
              <div className="flex flex-wrap items-center gap-2"><Chip active>No music</Chip><span className="flex items-center gap-1 text-xs text-muted"><Info className="h-3.5 w-3.5" /> Licensed music library and custom tracks are coming soon.</span></div>
            </div>

            <details className="group rounded-xl border border-border">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium">Additional options <span className="text-muted">(audience, language, scenes, CTA)</span></summary>
              <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2">
                <div><Label>Target audience</Label><Input value={settings.audience} onChange={(e) => set("audience", e.target.value)} placeholder="e.g. Small business owners" maxLength={120} /></div>
                <div><Label>Narration language</Label><Select value={settings.language} onChange={(e) => { set("language", e.target.value); set("voice", { ...settings.voice, language: e.target.value }); }}>{LANGUAGES.map((l) => <option key={l}>{l}</option>)}</Select></div>
                {modeDef.usesScript && <div><Label>Scene count</Label><Input type="number" min={1} max={36} value={settings.sceneCount ?? ""} onChange={(e) => set("sceneCount", e.target.value ? Number(e.target.value) : null)} placeholder="Auto" /></div>}
                {modeDef.usesScript && <div><Label>Call to action</Label><Input value={settings.cta} onChange={(e) => set("cta", e.target.value)} placeholder="e.g. Follow for more" maxLength={160} /></div>}
                <div className="sm:col-span-2"><Label>Custom instructions</Label><Textarea rows={3} value={settings.customInstructions} onChange={(e) => set("customInstructions", e.target.value)} maxLength={1000} placeholder="Anything else the writer should follow" /></div>
              </div>
            </details>
          </div>
        </section>
      </div>

      {/* Summary */}
      <aside className="xl:sticky xl:top-24 xl:self-start">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold">4. Review & generate</h2>
          <dl className="mt-4 space-y-2 text-sm">
            {[["Mode", modeDef.name], ["Duration", label(settings.durationSec)], ["Format", `${settings.aspectRatio} · HD`], ["Style", settings.style],
              ["Voiceover", settings.voice.enabled ? VOICES.find((v) => v.id === settings.voice.voiceId)?.name : "None"], ["Subtitles", settings.subtitles.enabled && settings.voice.enabled ? "On" : "Off"]]
              .map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="text-muted">{k}</dt><dd className="text-right">{v}</dd></div>)}
          </dl>
          <div className="my-5 h-px bg-border" />
          <div className="space-y-1.5 text-xs">
            {estimate?.breakdown.map((b) => <div key={b.label} className="flex justify-between text-muted"><span>{b.label}</span><span className="tabular-nums">{b.credits}</span></div>)}
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-brand/10 px-4 py-3">
            <span className="flex items-center gap-2 text-sm text-brand-soft"><Coins className="h-4 w-4" /> Estimated credits</span>
            <span className="text-lg font-semibold tabular-nums">{estimating && !estimate ? "…" : estimate?.total ?? "—"}</span>
          </div>
          {estimate && <p className="mt-2 text-xs text-muted">You have {estimate.available.toLocaleString()} credits. Credits are reserved now and only charged when your video completes.</p>}
          {estimate && !estimate.sufficient && <Alert tone="warning" className="mt-3">Not enough credits. <a href="/dashboard/billing" className="underline">Top up</a> or pick a shorter duration.</Alert>}
          {error && <Alert tone="danger" className="mt-3">{error}</Alert>}
          <Button className="mt-4 w-full" size="lg" onClick={submit} disabled={submitting || !estimate?.sufficient || prompt.trim().length < 10}>
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Starting…</> : <><Sparkles className="h-4 w-4" /> Generate video</>}
          </Button>
        </div>
      </aside>
    </div>
  );
}

function Chip({ active, disabled, onClick, children, title }: { active?: boolean; disabled?: boolean; onClick?: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button type="button" title={title} disabled={disabled} onClick={onClick}
      className={cn("inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors", active ? "border-brand bg-brand/15 text-fg" : "border-border text-muted hover:border-brand/40 hover:text-fg", disabled && "cursor-not-allowed opacity-40")}>
      {children}
    </button>
  );
}

function Toggle({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={cn("flex cursor-pointer items-center justify-between", disabled && "cursor-not-allowed opacity-50")}>
      <span className="text-sm font-medium">{label}</span>
      <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
        className={cn("relative h-6 w-11 rounded-full transition-colors", checked ? "bg-brand" : "bg-border")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform", checked ? "translate-x-5.5" : "translate-x-0.5")} />
      </button>
    </label>
  );
}

function RatioIcon({ r }: { r: string }) {
  const [w, h] = r.split(":").map(Number);
  const s = 14 / Math.max(w, h);
  return <span className="inline-block rounded-[2px] border border-current" style={{ width: w * s, height: h * s }} />;
}
