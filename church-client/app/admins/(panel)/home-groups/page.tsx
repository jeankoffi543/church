import { getAdminMe, getAdminHomeGroupsPaginated, getAdminUsers } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../_components/access-restricted";
import { HomeGroupsManager, HOME_GROUPS_PER_PAGE } from "./home-groups-manager";

export const dynamic = "force-dynamic";

export default async function AdminHomeGroupsPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.viewCells, PERMISSIONS.processCells])) {
    return <AccessRestricted />;
  }

  const [list, users] = await Promise.all([
    getAdminHomeGroupsPaginated({ perPage: HOME_GROUPS_PER_PAGE }),
    getAdminUsers(),
  ]);

  return <HomeGroupsManager initialHomeGroups={list.data} initialMeta={list.meta} users={users} />;
}
