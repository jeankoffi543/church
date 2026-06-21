import { getAdminMe, getAdminPrayers, getAdminUsers, getAdminSettings } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../_components/access-restricted";
import { PrayersManager } from "./prayers-manager";

export const dynamic = "force-dynamic";

export default async function AdminPrayersPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.viewPrayers, PERMISSIONS.processPrayers])) {
    return <AccessRestricted />;
  }

  const [prayers, users, settings] = await Promise.all([
    getAdminPrayers(),
    getAdminUsers(),
    getAdminSettings(),
  ]);

  const prayerSettings = settings.prayers || {};

  return (
    <PrayersManager
      initialPrayers={prayers}
      users={users}
      initialSuccessMessage={String(prayerSettings.prayer_success_ui_message || "")}
      initialNotificationMessage={String(prayerSettings.prayer_automated_notification_message || "")}
      initialCategories={Array.isArray(prayerSettings.prayer_categories) ? prayerSettings.prayer_categories : []}
    />
  );
}
