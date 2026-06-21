import { getAdminMe, getMinistryApplications } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../../_components/access-restricted";
import { ApplicationsManager } from "./applications-manager";

export const dynamic = "force-dynamic";

export default async function AdminMinistryApplicationsPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.validateMinistryApplications])) {
    return <AccessRestricted />;
  }

  const applications = await getMinistryApplications();

  return <ApplicationsManager initialApplications={applications} me={me!} />;
}
