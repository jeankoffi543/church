import { getAdminMe, getAdminMinistriesPaginated, getAdminUsers } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../_components/access-restricted";
import { MinistriesManager, MINISTRIES_PER_PAGE } from "./ministries-manager";

export const dynamic = "force-dynamic";

export default async function AdminMinistriesPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.manageSettings])) {
    return <AccessRestricted />;
  }

  const [list, staff] = await Promise.all([
    getAdminMinistriesPaginated({ perPage: MINISTRIES_PER_PAGE }),
    getAdminUsers(),
  ]);

  return <MinistriesManager initialMinistries={list.data} initialMeta={list.meta} staff={staff} />;
}
