import { getAdminMe, getAdminHomeGroups } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../_components/access-restricted";
import { HomeGroupsManager } from "./home-groups-manager";

export const dynamic = "force-dynamic";

export default async function AdminHomeGroupsPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.viewCells, PERMISSIONS.processCells])) {
    return <AccessRestricted />;
  }

  const homeGroups = await getAdminHomeGroups();

  return <HomeGroupsManager initialHomeGroups={homeGroups} />;
}
