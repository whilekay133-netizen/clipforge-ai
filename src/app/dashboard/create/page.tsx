import type { Metadata } from "next";
import { getSessionProfile } from "@/lib/auth";
import { PageHeader } from "@/components/ui/misc";
import { Studio } from "@/components/dashboard/studio";
import type { Plan } from "@/lib/types";

export const metadata: Metadata = { title: "Create video" };

export default async function CreatePage({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  const { template } = await searchParams;
  const { supabase } = await getSessionProfile();
  const { data: sub } = await supabase.from("subscriptions").select("plans(limits)").eq("status", "active").maybeSingle();
  const maxDuration = (sub?.plans as unknown as Pick<Plan, "limits"> | null)?.limits?.max_duration_sec ?? 30;
  return (
    <>
      <PageHeader title="Create a video" description="Describe it, configure it, and we'll produce it in the background." />
      <Studio maxDuration={maxDuration} templateId={template} />
    </>
  );
}
