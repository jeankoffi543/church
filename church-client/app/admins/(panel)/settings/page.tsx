import { getAdminMe, getAdminSettings } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../_components/access-restricted";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const me = await getAdminMe();

  if (
    !hasAnyPermission(me, [
      PERMISSIONS.manageSettings,
      PERMISSIONS.manageLive,
      PERMISSIONS.managePrayerSettings,
    ])
  ) {
    return <AccessRestricted />;
  }

  const settings = await getAdminSettings();

  return <SettingsForm initialSettings={settings} />;
}
