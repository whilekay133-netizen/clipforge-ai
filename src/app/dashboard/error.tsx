"use client";
import { Button } from "@/components/ui/button";

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="mt-2 text-sm text-muted">We couldn&apos;t load this page. Please try again.</p>
      <Button className="mt-6" onClick={reset}>Try again</Button>
    </div>
  );
}
