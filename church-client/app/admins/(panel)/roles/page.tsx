import { getAdminMe, getAdminRoles, getPermissionCatalog } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../_components/access-restricted";
import { RolesManager } from "./roles-manager";

export const dynamic = "force-dynamic";

export default async function AdminRolesPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.manageAccess])) {
    return <AccessRestricted />;
  }

  const [roles, catalog] = await Promise.all([
    getAdminRoles(),
    getPermissionCatalog(),
  ]);

  return <RolesManager initialRoles={roles} catalog={catalog} />;
}
