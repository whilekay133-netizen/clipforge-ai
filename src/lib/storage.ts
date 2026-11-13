import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export const BUCKET = "media";

export const paths = {
  upload: (userId: string, name: string) => `users/${userId}/uploads/${name}`,
  scene: (userId: string, projectId: string, n: number) => `users/${userId}/projects/${projectId}/scenes/scene-${String(n).padStart(2, "0")}.mp4`,
  audio: (userId: string, projectId: string, ext = "mp3") => `users/${userId}/projects/${projectId}/audio/voiceover.${ext}`,
  render: (userId: string, projectId: string) => `users/${userId}/projects/${projectId}/renders/final.mp4`,
  thumbnail: (userId: string, projectId: string) => `users/${userId}/projects/${projectId}/renders/thumbnail.jpg`,
};

export async function uploadBytes(admin: SupabaseClient, path: string, bytes: Uint8Array | ArrayBuffer, contentType: string) {
  const { error } = await admin.storage.from(BUCKET).upload(path, bytes, { contentType, upsert: true });
  if (error) throw new Error(`Storage upload failed (${path}): ${error.message}`);
  return path;
}

/** Download a provider-hosted file and persist it in private storage. */
export async function copyRemoteToStorage(admin: SupabaseClient, url: string, path: string, fallbackType: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${res.status} for ${new URL(url).host}`);
  const contentType = res.headers.get("content-type") || fallbackType;
  const bytes = new Uint8Array(await res.arrayBuffer());
  await uploadBytes(admin, path, bytes, contentType);
  return { path, size: bytes.byteLength, contentType };
}

export async function signedUrl(client: SupabaseClient, path: string | null | undefined, expiresIn = 3600, download?: string) {
  if (!path) return null;
  const { data } = await client.storage.from(BUCKET).createSignedUrl(path, expiresIn, download ? { download } : undefined);
  return data?.signedUrl ?? null;
}

export async function signedUrls(client: SupabaseClient, pathList: string[], expiresIn = 3600) {
  if (!pathList.length) return {} as Record<string, string>;
  const { data } = await client.storage.from(BUCKET).createSignedUrls(pathList, expiresIn);
  return Object.fromEntries((data ?? []).filter((d) => d.signedUrl && d.path).map((d) => [d.path!, d.signedUrl as string])) as Record<string, string>;
}
