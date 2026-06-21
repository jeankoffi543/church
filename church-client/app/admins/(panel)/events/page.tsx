import { getAdminEvents } from "@/lib/admin-api";
import { EventsManager } from "./events-manager";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const events = await getAdminEvents();

  return <EventsManager initialEvents={events} />;
}
