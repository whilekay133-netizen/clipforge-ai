import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-screen place-items-center px-5 py-16">
      <div className="glow pointer-events-none absolute inset-0" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="rounded-2xl border border-border bg-surface/90 p-7 shadow-2xl backdrop-blur">{children}</div>
      </div>
    </div>
  );
}
