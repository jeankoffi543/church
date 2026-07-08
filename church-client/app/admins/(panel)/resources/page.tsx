import { getAdminMe, getAdminResources, getAdminResourceBookings } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../_components/access-restricted";
import { ResourcesManager } from "./resources-manager";

export const dynamic = "force-dynamic";

export default async function AdminResourcesPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.viewResources, PERMISSIONS.manageResources])) {
    return <AccessRestricted />;
  }

  const [resources, bookings] = await Promise.all([
    getAdminResources({ page: 1, perPage: 50, sort: { field: "name", dir: "asc" } }),
    getAdminResourceBookings({ page: 1, perPage: 20, sort: { field: "starts_at", dir: "asc" } }),
  ]);

  return (
    <ResourcesManager
      initialResources={resources.data}
      initialBookings={bookings.data}
      initialBookingsMeta={bookings.meta}
      canManage={hasAnyPermission(me, [PERMISSIONS.manageResources])}
    />
  );
}
