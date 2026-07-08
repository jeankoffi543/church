import { getAdminMe, getAdminMembers, getAdminHomeGroups } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../_components/access-restricted";
import { MembersManager } from "./members-manager";

export const dynamic = "force-dynamic";

export default async function AdminMembersPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.viewMembers, PERMISSIONS.manageMembers])) {
    return <AccessRestricted />;
  }

  const [initial, homeGroups] = await Promise.all([
    getAdminMembers({ page: 1, perPage: 20, sort: { field: "created_at", dir: "desc" } }),
    getAdminHomeGroups(),
  ]);

  return (
    <MembersManager
      initialData={initial.data}
      initialMeta={initial.meta}
      homeGroups={homeGroups}
      canManage={hasAnyPermission(me, [PERMISSIONS.manageMembers])}
    />
  );
}
