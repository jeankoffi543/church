import { getAdminMe, getAdminTeams, getAdminMembers } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../_components/access-restricted";
import { TeamsManager } from "./teams-manager";

export const dynamic = "force-dynamic";

export default async function AdminTeamsPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.viewTeams, PERMISSIONS.manageTeams])) {
    return <AccessRestricted />;
  }

  const [teams, members] = await Promise.all([
    getAdminTeams({ page: 1, perPage: 50, sort: { field: "name", dir: "asc" } }),
    getAdminMembers({ page: 1, perPage: 500, sort: { field: "name", dir: "asc" } }),
  ]);

  return (
    <TeamsManager
      initialTeams={teams.data}
      members={members.data}
      canManage={hasAnyPermission(me, [PERMISSIONS.manageTeams])}
    />
  );
}
