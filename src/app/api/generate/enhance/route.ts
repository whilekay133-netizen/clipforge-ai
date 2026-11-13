import { z } from "zod";
import { handle, json, HttpError } from "@/lib/http";
import { requireApiUser } from "@/lib/auth";
import { providers } from "@/lib/providers";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({ prompt: z.string().trim().min(5).max(4000), mode: z.string().max(40) });

export const POST = handle(async (req: Request) => {
  const { profile } = await requireApiUser();
  const body = schema.parse(await req.json());
  if (!rateLimit(`enhance:${profile.id}`, 20, 3600_000)) throw new HttpError(429, "Too many enhancement requests. Try again later.");
  const enhanced = await providers.text().enhancePrompt(body.prompt, body.mode);
  return json({ original: body.prompt, enhanced });
});
