import { getAdminSettings } from "@/lib/admin-api";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getAdminSettings();

  return <SettingsForm initialSettings={settings} />;
}
