import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_RATES, type CreditRates } from "./pricing";
import { HttpError } from "./http";

export async function getCreditRates(admin: SupabaseClient): Promise<CreditRates> {
  const { data } = await admin.from("app_settings").select("value").eq("key", "credit_rates").maybeSingle();
  return { ...DEFAULT_RATES, ...((data?.value as Partial<CreditRates>) ?? {}) };
}

export async function reserveCredits(admin: SupabaseClient, userId: string, amount: number, reference: string, description: string) {
  const { error } = await admin.rpc("reserve_credits", { p_user: userId, p_amount: amount, p_reference: reference, p_description: description });
  if (error) {
    if (error.message.includes("INSUFFICIENT_CREDITS")) throw new HttpError(402, "Not enough credits for this video. Top up or choose a shorter duration.", "INSUFFICIENT_CREDITS");
    throw new Error(`reserve_credits failed: ${error.message}`);
  }
}

export async function settleCredits(admin: SupabaseClient, userId: string, reserved: number, actual: number, reference: string, description: string) {
  const { error } = await admin.rpc("settle_credits", { p_user: userId, p_reserved: reserved, p_actual: actual, p_reference: reference, p_description: description });
  if (error) throw new Error(`settle_credits failed: ${error.message}`);
}

export async function grantCredits(
  admin: SupabaseClient, userId: string, amount: number,
  type: "grant" | "purchase" | "refund" | "admin_adjustment", reference: string, description: string,
) {
  const { error } = await admin.rpc("grant_credits", { p_user: userId, p_amount: amount, p_type: type, p_reference: reference, p_description: description });
  if (error) {
    if (error.message.includes("INSUFFICIENT_CREDITS")) throw new HttpError(400, "Adjustment would make the balance negative.");
    throw new Error(`grant_credits failed: ${error.message}`);
  }
}
