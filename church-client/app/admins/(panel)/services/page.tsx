import { getAdminMe, getAdminMembers, getAdminServices, getAdminTeams } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../_components/access-restricted";
import { ServicesManager } from "./services-manager";

export const dynamic = "force-dynamic";

export default async function AdminServicesPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.viewServices, PERMISSIONS.manageServices])) {
    return <AccessRestricted />;
  }

  const canManageTeams = hasAnyPermission(me, [PERMISSIONS.manageTeams]);

  const [initial, members, teams] = await Promise.all([
    getAdminServices({ page: 1, perPage: 20, sort: { field: "date", dir: "desc" } }),
    canManageTeams ? getAdminMembers({ page: 1, perPage: 500, sort: { field: "name", dir: "asc" } }) : null,
    canManageTeams ? getAdminTeams({ page: 1, perPage: 100, sort: { field: "name", dir: "asc" } }) : null,
  ]);

  return (
    <ServicesManager
      initialData={initial.data}
      initialMeta={initial.meta}
      canManage={hasAnyPermission(me, [PERMISSIONS.manageServices])}
      canRecordAttendance={hasAnyPermission(me, [PERMISSIONS.manageAttendance])}
      canManageTeams={canManageTeams}
      members={members?.data ?? []}
      teams={teams?.data ?? []}
    />
  );
}
