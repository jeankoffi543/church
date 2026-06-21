import { getAdminMe, getAdminEvents } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../_components/access-restricted";
import { EventsManager } from "./events-manager";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.manageEvents])) {
    return <AccessRestricted />;
  }

  const events = await getAdminEvents();

  return <EventsManager initialEvents={events} />;
}
