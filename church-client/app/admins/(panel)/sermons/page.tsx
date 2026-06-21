import { getAdminMe, getAdminSermons } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../_components/access-restricted";
import { SermonsManager } from "./sermons-manager";

export const dynamic = "force-dynamic";

export default async function AdminSermonsPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.manageSermons])) {
    return <AccessRestricted />;
  }

  const sermons = await getAdminSermons();

  return <SermonsManager initialSermons={sermons} />;
}
