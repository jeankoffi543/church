import { getAdminMe, getAdminEventsPaginated } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../_components/access-restricted";
import { EventsManager, EVENTS_PER_PAGE } from "./events-manager";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.manageEvents])) {
    return <AccessRestricted />;
  }

  const { data, meta } = await getAdminEventsPaginated({ perPage: EVENTS_PER_PAGE });

  return <EventsManager initialEvents={data} initialMeta={meta} />;
}
