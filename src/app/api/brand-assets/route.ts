import crypto from "crypto";
import { z } from "zod";
import { handle, json, HttpError } from "@/lib/http";
import { requireApiUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET, paths, signedUrls, uploadBytes } from "@/lib/storage";

const ALLOWED: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const MAX_BYTES = 5 * 1024 * 1024;

export const GET = handle(async () => {
  const { supabase } = await requireApiUser();
  const { data } = await supabase.from("assets").select("*").eq("asset_type", "brand_logo").order("created_at", { ascending: false });
  const urls = await signedUrls(supabase, (data ?? []).map((a) => a.storage_path));
  return json({ items: (data ?? []).map((a) => ({ ...a, url: urls[a.storage_path] ?? null })) });
});

export const POST = handle(async (req: Request) => {
  const { profile } = await requireApiUser();
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "Choose a file to upload.");
  const ext = ALLOWED[file.type];
  if (!ext) throw new HttpError(400, "Only PNG, JPG and WEBP images are allowed.");
  if (file.size > MAX_BYTES) throw new HttpError(400, "Logos must be 5 MB or smaller.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  // verify magic bytes, not just the declared type
  const sig = Buffer.from(bytes.slice(0, 12)).toString("hex");
  const ok = (ext === "png" && sig.startsWith("89504e47")) || (ext === "jpg" && sig.startsWith("ffd8ff")) || (ext === "webp" && sig.startsWith("52494646") && sig.slice(16, 24) === "57454250");
  if (!ok) throw new HttpError(400, "The file content doesn't match its type.");

  const admin = createAdminClient();
  const path = paths.upload(profile.id, `brand-${crypto.randomUUID()}.${ext}`);
  await uploadBytes(admin, path, bytes, file.type);
  const { data, error } = await admin.from("assets").insert({ user_id: profile.id, asset_type: "brand_logo", storage_path: path, mime_type: file.type, size_bytes: file.size }).select("id").single();
  if (error) throw new Error(error.message);
  return json({ id: data.id }, 201);
});

export const DELETE = handle(async (req: Request) => {
  const { profile, supabase } = await requireApiUser();
  const { id } = z.object({ id: z.string().uuid() }).parse(await req.json());
  const { data: asset } = await supabase.from("assets").select("id, storage_path").eq("id", id).eq("asset_type", "brand_logo").maybeSingle();
  if (!asset) throw new HttpError(404, "Asset not found");
  const admin = createAdminClient();
  await admin.storage.from(BUCKET).remove([asset.storage_path]);
  await admin.from("assets").delete().eq("id", asset.id).eq("user_id", profile.id);
  return json({ ok: true });
});
