import { getAdminMe, getMinistryApplicationsPaginated } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../../_components/access-restricted";
import { ApplicationsManager, MINISTRY_APPLICATIONS_PER_PAGE } from "./applications-manager";

export const dynamic = "force-dynamic";

export default async function AdminMinistryApplicationsPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.validateMinistryApplications])) {
    return <AccessRestricted />;
  }

  const [list, pending] = await Promise.all([
    getMinistryApplicationsPaginated({ perPage: MINISTRY_APPLICATIONS_PER_PAGE }),
    getMinistryApplicationsPaginated({ filters: { status: "pending" }, perPage: 1 }),
  ]);

  return (
    <ApplicationsManager
      initialApplications={list.data}
      initialMeta={list.meta}
      initialPendingCount={pending.meta.total}
      me={me!}
    />
  );
}
