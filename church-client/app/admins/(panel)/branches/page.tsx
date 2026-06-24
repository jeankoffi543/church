import { getAdminMe, getAdminBranchesPaginated, getAdminUsers } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../_components/access-restricted";
import { BranchesManager, BRANCHES_PER_PAGE } from "./branches-manager";

export const dynamic = "force-dynamic";

export default async function AdminBranchesPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.viewBranches, PERMISSIONS.manageBranches])) {
    return <AccessRestricted />;
  }

  const [list, users] = await Promise.all([
    getAdminBranchesPaginated({ perPage: BRANCHES_PER_PAGE }),
    getAdminUsers(),
  ]);

  return <BranchesManager initialBranches={list.data} initialMeta={list.meta} users={users} />;
}
