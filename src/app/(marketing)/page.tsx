import Link from "next/link";
import { ArrowRight, BookOpen, Captions, Clapperboard, Download, GraduationCap, Megaphone, Mic, PenLine, Ratio, Settings2, ShieldCheck, Smartphone, Sparkles, Wand2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ProductPreview } from "@/components/marketing/product-preview";
import { FAQS } from "@/components/marketing/faq-data";

const steps = [
  { icon: PenLine, title: "Describe", text: "Type a topic, a story or a detailed brief. Let Claude polish it if you like." },
  { icon: Settings2, title: "Configure", text: "Pick duration, aspect ratio, visual style, voice and subtitles. See the credit estimate up front." },
  { icon: Wand2, title: "Generate", text: "We write the script, plan scenes, generate visuals and narration, then render — in the background." },
  { icon: Download, title: "Download", text: "Preview, tweak subtitles and download the MP4. Every video stays in your library." },
];

const useCases = [
  { icon: Clapperboard, title: "Faceless channels", text: "Narrated explainers, facts and documentaries without ever appearing on camera." },
  { icon: Smartphone, title: "Social media", text: "Presets for Shorts, TikTok, Reels, Facebook and LinkedIn with the right frame and pacing." },
  { icon: GraduationCap, title: "Education", text: "Turn lessons into visual explainers with clear narration and subtitles." },
  { icon: BookOpen, title: "Storytelling", text: "Characters, story beats and scenes generated and narrated as a short film." },
  { icon: Megaphone, title: "Marketing", text: "Launch teasers, promos and campaign clips with a call to action built in." },
];

const features = [
  { icon: Sparkles, title: "Claude-written scripts", text: "Structured scripts and scene plans, validated before a single frame is generated." },
  { icon: Mic, title: "Natural voiceovers", text: "Studio-quality narration in multiple voices, speeds and languages." },
  { icon: Captions, title: "Editable subtitles", text: "Word-timed captions you can edit and export as VTT or SRT." },
  { icon: Ratio, title: "Every format", text: "16:9, 9:16 and 1:1 output from the same brief." },
  { icon: ShieldCheck, title: "Private by default", text: "Your projects and media are visible only to you." },
  { icon: Wand2, title: "Honest progress", text: "See the real stage your video is in — no fake progress bars." },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]" />
        <div className="glow absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-20 text-center md:pt-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs text-brand-soft">
            <Sparkles className="h-3.5 w-3.5" /> Script, scenes, voice and subtitles — one workflow
          </span>
          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Turn a sentence into a <span className="text-gradient">finished video</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted md:text-lg">
            ClipForge AI writes the script, generates every scene, records the narration, adds subtitles and renders an MP4 you can publish. No editing skills required.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register" className={buttonVariants({ size: "lg" })}>Create your first video <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/#how-it-works" className={buttonVariants({ size: "lg", variant: "secondary" })}>See how it works</Link>
          </div>
          <p className="mt-4 text-xs text-muted">Free plan includes 100 credits. No card required.</p>
          <div className="mt-16"><ProductPreview /></div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-20 border-t border-border/60 py-24">
        <div className="mx-auto max-w-6xl px-5">
          <SectionTitle eyebrow="How it works" title="From prompt to MP4 in four steps" />
          <div className="mt-12 grid gap-4 md:grid-cols-4">
            {steps.map((s, i) => (
              <div key={s.title} className="relative rounded-2xl border border-border bg-surface p-6">
                <span className="absolute right-5 top-5 font-mono text-xs text-muted">0{i + 1}</span>
                <s.icon className="h-6 w-6 text-brand-soft" />
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="use-cases" className="scroll-mt-20 border-t border-border/60 py-24">
        <div className="mx-auto max-w-6xl px-5">
          <SectionTitle eyebrow="Use cases" title="Built for people who need video, not an editing suite" />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {useCases.map((u) => (
              <div key={u.title} className="rounded-2xl border border-border bg-gradient-to-b from-surface-2/80 to-surface p-6">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand/15 text-brand-soft"><u.icon className="h-5 w-5" /></div>
                <h3 className="mt-4 font-semibold">{u.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{u.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 py-24">
        <div className="mx-auto max-w-6xl px-5">
          <SectionTitle eyebrow="Features" title="Everything between the idea and the upload" />
          <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="flex gap-4">
                <f.icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <div><h3 className="font-semibold">{f.title}</h3><p className="mt-1 text-sm text-muted">{f.text}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 py-24">
        <div className="mx-auto max-w-3xl px-5">
          <SectionTitle eyebrow="FAQ" title="Questions, answered" />
          <div className="mt-10 divide-y divide-border rounded-2xl border border-border bg-surface">
            {FAQS.slice(0, 5).map((f) => (
              <details key={f.q} className="group px-6 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between font-medium">{f.q}<span className="text-muted transition-transform group-open:rotate-45">+</span></summary>
                <p className="mt-3 text-sm text-muted">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-center text-sm"><Link href="/faq" className="text-brand-soft hover:underline">See all questions</Link></p>
        </div>
      </section>

      <section className="px-5 pb-24">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-brand/30 bg-gradient-to-br from-brand/25 via-surface to-surface px-8 py-16 text-center">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Your next video is one prompt away</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">Sign up free, get 100 credits and make your first video today.</p>
          <Link href="/register" className={buttonVariants({ size: "lg", className: "mt-8" })}>Start creating <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>
    </>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-soft">{eyebrow}</p>
      <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">{title}</h2>
    </div>
  );
}
