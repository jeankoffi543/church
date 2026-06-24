import { getAdminMe, getAdminHomeGroups, getAdminHomeGroupApplications } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../../_components/access-restricted";
import { ApplicationsManager } from "./applications-manager";

export const dynamic = "force-dynamic";

export default async function AdminHomeGroupApplicationsPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.validateHomeGroupApplications])) {
    return <AccessRestricted />;
  }

  const [applications, homeGroups] = await Promise.all([
    getAdminHomeGroupApplications(),
    getAdminHomeGroups(),
  ]);

  return (
    <ApplicationsManager
      initialApplications={applications}
      homeGroups={homeGroups}
      me={me}
    />
  );
}
