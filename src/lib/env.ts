import "server-only";

/** Read a required server-side environment variable, failing with a clear configuration error. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new ConfigError(`Missing environment variable ${name}. Add it to .env.local (local) or your Vercel project settings.`);
  return value;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export const appUrl = () => process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";

export function integrationStatus() {
  return {
    supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    fal: Boolean(process.env.FAL_KEY),
    paystack: Boolean(process.env.PAYSTACK_SECRET_KEY),
    inngest: Boolean(process.env.INNGEST_EVENT_KEY) || process.env.NODE_ENV !== "production",
  };
}
