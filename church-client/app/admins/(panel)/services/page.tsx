import { getAdminMe, getAdminServices } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../_components/access-restricted";
import { ServicesManager } from "./services-manager";

export const dynamic = "force-dynamic";

export default async function AdminServicesPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.viewServices, PERMISSIONS.manageServices])) {
    return <AccessRestricted />;
  }

  const initial = await getAdminServices({ page: 1, perPage: 20, sort: { field: "date", dir: "desc" } });

  return (
    <ServicesManager
      initialData={initial.data}
      initialMeta={initial.meta}
      canManage={hasAnyPermission(me, [PERMISSIONS.manageServices])}
      canRecordAttendance={hasAnyPermission(me, [PERMISSIONS.manageAttendance])}
    />
  );
}
