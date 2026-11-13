import { handle, json } from "@/lib/http";
import { requireApiUser } from "@/lib/auth";
import { profileUpdateSchema } from "@/lib/validation";

export const GET = handle(async () => {
  const { profile, supabase } = await requireApiUser();
  const [{ data: wallet }, { data: sub }, { count: total }, { count: completed }] = await Promise.all([
    supabase.from("credit_wallets").select("available, reserved").eq("user_id", profile.id).single(),
    supabase.from("subscriptions").select("status, renews_at, plans(name, slug)").eq("user_id", profile.id).eq("status", "active").maybeSingle(),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("user_id", profile.id).eq("status", "completed"),
  ]);
  return json({ profile, wallet, subscription: sub, stats: { totalProjects: total ?? 0, completedVideos: completed ?? 0 } });
});

export const PATCH = handle(async (req: Request) => {
  const { profile, supabase } = await requireApiUser();
  const body = profileUpdateSchema.parse(await req.json());
  const { error } = await supabase.from("profiles").update({ full_name: body.full_name }).eq("id", profile.id);
  if (error) throw new Error(error.message);
  return json({ ok: true });
});
