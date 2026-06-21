import { getAdminHomeGroups } from "@/lib/admin-api";
import { HomeGroupsManager } from "./home-groups-manager";

export const dynamic = "force-dynamic";

export default async function AdminHomeGroupsPage() {
  const homeGroups = await getAdminHomeGroups();

  return <HomeGroupsManager initialHomeGroups={homeGroups} />;
}
