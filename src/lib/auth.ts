import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";
import { HttpError } from "./http";
import type { Profile } from "./types";

/** For route handlers: returns the authenticated, active user or throws 401/403. */
export async function requireApiUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new HttpError(401, "Please sign in.");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  if (!profile) throw new HttpError(403, "Profile not found.");
  if (profile.account_status !== "active") throw new HttpError(403, "Your account is suspended. Contact support.");
  return { user, profile, supabase };
}

export async function requireApiAdmin() {
  const ctx = await requireApiUser();
  if (ctx.profile.role !== "admin") throw new HttpError(403, "Admins only.");
  return { ...ctx, admin: createAdminClient() };
}

/** For server components/pages. */
export async function getSessionProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  if (!profile) redirect("/login?error=profile");
  return { user, profile, supabase };
}

export async function requireAdminPage() {
  const ctx = await getSessionProfile();
  if (ctx.profile.role !== "admin") redirect("/dashboard");
  return { ...ctx, admin: createAdminClient() };
}
