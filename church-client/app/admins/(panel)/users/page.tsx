import { getAdminMe, getServantsPaginated, getAdminRoles } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../_components/access-restricted";
import { UsersManager, USERS_PER_PAGE } from "./users-manager";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.manageAccess])) {
    return <AccessRestricted />;
  }

  const [list, roles] = await Promise.all([
    getServantsPaginated({ perPage: USERS_PER_PAGE }),
    getAdminRoles(),
  ]);

  return (
    <UsersManager
      initialServants={list.data}
      initialMeta={list.meta}
      roleNames={roles.map((r) => r.name)}
      currentUserId={me!.id}
    />
  );
}
