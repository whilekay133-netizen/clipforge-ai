import { handle, json } from "@/lib/http";
import { requireApiUser } from "@/lib/auth";
import { estimateSchema } from "@/lib/validation";
import { estimateCredits } from "@/lib/pricing";
import { getCreditRates } from "@/lib/credits";
import { createAdminClient } from "@/lib/supabase/admin";

export const POST = handle(async (req: Request) => {
  const { profile, supabase } = await requireApiUser();
  const body = estimateSchema.parse(await req.json());
  const rates = await getCreditRates(createAdminClient());
  const estimate = estimateCredits({ mode: body.mode, durationSec: body.settings.durationSec, voiceEnabled: body.settings.voice.enabled }, rates);
  const { data: wallet } = await supabase.from("credit_wallets").select("available").eq("user_id", profile.id).single();
  return json({ ...estimate, available: wallet?.available ?? 0, sufficient: (wallet?.available ?? 0) >= estimate.total });
});
