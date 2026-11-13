import { handle, json } from "@/lib/http";
import { requireApiUser } from "@/lib/auth";

export const GET = handle(async () => {
  const { profile, supabase } = await requireApiUser();
  const { data } = await supabase.from("credit_wallets").select("available, reserved, updated_at").eq("user_id", profile.id).single();
  return json(data ?? { available: 0, reserved: 0 });
});
