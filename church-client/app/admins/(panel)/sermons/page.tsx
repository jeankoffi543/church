import { getAdminMe, getAdminSermons, getAdminUsers } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../_components/access-restricted";
import { SermonsManager } from "./sermons-manager";

export const dynamic = "force-dynamic";

export default async function AdminSermonsPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.manageSermons])) {
    return <AccessRestricted />;
  }

  const [sermons, users] = await Promise.all([getAdminSermons(), getAdminUsers()]);

  return <SermonsManager initialSermons={sermons} preachers={users.map((u) => ({ id: u.id, name: u.name }))} />;
}
