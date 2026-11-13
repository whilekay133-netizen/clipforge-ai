import "server-only";

// Per-instance sliding window. For multi-region production traffic, back this with Upstash/Redis.
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= limit) return false;
  list.push(now);
  hits.set(key, list);
  return true;
}
