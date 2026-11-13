import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function notify(admin: SupabaseClient, userId: string, n: { title: string; message: string; type?: string; link?: string }) {
  await admin.from("notifications").insert({ user_id: userId, title: n.title, message: n.message, type: n.type ?? "info", link: n.link ?? null });
}

export const LOW_CREDIT_THRESHOLD = 30;
