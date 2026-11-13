import { z } from "zod";
import { handle, json } from "@/lib/http";
import { requireApiUser } from "@/lib/auth";

export const GET = handle(async () => {
  const { supabase } = await requireApiUser();
  const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(20);
  return json({ items: data ?? [], unread: (data ?? []).filter((n) => !n.is_read).length });
});

export const PATCH = handle(async (req: Request) => {
  const { supabase, profile } = await requireApiUser();
  const body = z.object({ ids: z.array(z.string().uuid()).max(100).optional(), all: z.boolean().optional() }).parse(await req.json());
  let q = supabase.from("notifications").update({ is_read: true }).eq("user_id", profile.id);
  if (!body.all && body.ids) q = q.in("id", body.ids);
  const { error } = await q;
  if (error) throw new Error(error.message);
  return json({ ok: true });
});
