import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Plan } from "./types";

/** Public plan list (anon key + RLS: active plans only). Returns null if the database is not configured/reachable. */
export async function getPublicPlans(): Promise<Plan[] | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const { data, error } = await createClient(url, key, { auth: { persistSession: false } }).from("plans").select("*").order("sort_order");
    if (error) return null;
    return data as Plan[];
  } catch {
    return null;
  }
}
