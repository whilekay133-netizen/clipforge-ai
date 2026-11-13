import type { Metadata } from "next";
import { getSessionProfile } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { PasswordForm, ProfileForm } from "@/components/dashboard/settings-forms";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { profile } = await getSessionProfile();
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Settings" description={`Member since ${formatDate(profile.created_at)}`} />
      <Card><CardHeader><CardTitle>Profile</CardTitle></CardHeader><CardContent><ProfileForm fullName={profile.full_name} email={profile.email} /></CardContent></Card>
      <Card><CardHeader><CardTitle>Password</CardTitle><CardDescription>If you signed up with Google, you can set a password here too.</CardDescription></CardHeader><CardContent><PasswordForm /></CardContent></Card>
      <Card><CardHeader><CardTitle>Session</CardTitle><CardDescription>Sign out of ClipForge on this device.</CardDescription></CardHeader>
        <CardContent><form action="/auth/signout" method="post"><Button variant="secondary">Log out</Button></form></CardContent></Card>
      <Card><CardHeader><CardTitle>Delete account</CardTitle><CardDescription>To permanently delete your account and all media, contact support from the contact page. We confirm deletion by email.</CardDescription></CardHeader><CardContent /></Card>
    </div>
  );
}
