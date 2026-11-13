import { handle, json, HttpError } from "@/lib/http";
import { contactSchema } from "@/lib/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";

export const POST = handle(async (req: Request) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`contact:${ip}`, 5, 3600_000)) throw new HttpError(429, "Too many messages. Please try again later.");
  const body = contactSchema.parse(await req.json());
  const { error } = await createAdminClient().from("contact_messages").insert(body);
  if (error) throw new Error(error.message);
  return json({ ok: true }, 201);
});
