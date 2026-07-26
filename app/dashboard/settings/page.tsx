import { redirect } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SettingsProfile } from "@/components/dashboard/settings-profile";

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("full_name, company_name").eq("id", user.id).maybeSingle();
  return <div className="space-y-8"><PageHeader title="Settings" description="Manage your workspace profile." /><SettingsProfile initialName={profile?.full_name || user.user_metadata.full_name || user.email?.split("@")[0] || ""} email={user.email ?? ""} companyName={profile?.company_name ?? ""} /></div>;
}
