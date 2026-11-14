import { Logo } from "@/components/logo";
import { FilmStrip } from "@/components/motion/film-strip";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-5 py-16">
      <FilmStrip rows={4} className="absolute inset-x-[-10%] top-1/2 -translate-y-1/2 opacity-70" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_50%_at_50%_50%,rgb(6_7_15/0.9),rgb(6_7_15/0.45))]" />
      <div className="glow pointer-events-none absolute inset-0" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="rounded-2xl border border-border bg-surface/90 p-7 shadow-2xl backdrop-blur">{children}</div>
      </div>
    </div>
  );
}
