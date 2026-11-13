import { handle, json } from "@/lib/http";
import { requireApiUser } from "@/lib/auth";

export const GET = handle(async (req: Request) => {
  const { supabase } = await requireApiUser();
  const page = Math.max(1, Number(new URL(req.url).searchParams.get("page") ?? 1));
  const size = 25;
  const { data, count } = await supabase.from("credit_transactions").select("*", { count: "exact" })
    .order("created_at", { ascending: false }).range((page - 1) * size, page * size - 1);
  return json({ items: data ?? [], total: count ?? 0, page });
});
