import { getAdminMe, getAdminPrayersPaginated, getAdminUsers, getAdminSettings } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../_components/access-restricted";
import { PrayersManager, PRAYERS_PER_PAGE } from "./prayers-manager";

export const dynamic = "force-dynamic";

export default async function AdminPrayersPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.viewPrayers, PERMISSIONS.processPrayers])) {
    return <AccessRestricted />;
  }

  const [list, newPrayers, users, settings] = await Promise.all([
    getAdminPrayersPaginated({ perPage: PRAYERS_PER_PAGE }),
    getAdminPrayersPaginated({ filters: { status: "new" }, perPage: 1 }),
    getAdminUsers(),
    getAdminSettings(),
  ]);

  const prayerSettings = settings.prayers || {};

  return (
    <PrayersManager
      initialPrayers={list.data}
      initialMeta={list.meta}
      initialNewCount={newPrayers.meta.total}
      users={users}
      initialSuccessMessage={String(prayerSettings.prayer_success_ui_message || "")}
      initialNotificationMessage={String(prayerSettings.prayer_automated_notification_message || "")}
      initialCategories={Array.isArray(prayerSettings.prayer_categories) ? prayerSettings.prayer_categories : []}
    />
  );
}
