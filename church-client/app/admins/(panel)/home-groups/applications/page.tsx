import { getAdminMe, getAdminHomeGroups, getAdminHomeGroupApplicationsPaginated } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../../_components/access-restricted";
import { ApplicationsManager, HOME_GROUP_APPLICATIONS_PER_PAGE } from "./applications-manager";

export const dynamic = "force-dynamic";

export default async function AdminHomeGroupApplicationsPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.validateHomeGroupApplications])) {
    return <AccessRestricted />;
  }

  const [list, homeGroups] = await Promise.all([
    getAdminHomeGroupApplicationsPaginated({ perPage: HOME_GROUP_APPLICATIONS_PER_PAGE }),
    getAdminHomeGroups(),
  ]);

  return (
    <ApplicationsManager
      initialApplications={list.data}
      initialMeta={list.meta}
      homeGroups={homeGroups}
      me={me}
    />
  );
}
