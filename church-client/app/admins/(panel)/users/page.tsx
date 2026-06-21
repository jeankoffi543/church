import { getAdminMe, getServants, getAdminRoles } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../_components/access-restricted";
import { UsersManager } from "./users-manager";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.manageAccess])) {
    return <AccessRestricted />;
  }

  const [servants, roles] = await Promise.all([
    getServants(),
    getAdminRoles(),
  ]);

  return (
    <UsersManager
      initialServants={servants}
      roleNames={roles.map((r) => r.name)}
      currentUserId={me!.id}
    />
  );
}
