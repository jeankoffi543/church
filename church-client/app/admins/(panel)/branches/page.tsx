import { getAdminMe, getAdminBranches, getAdminUsers } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../_components/access-restricted";
import { BranchesManager } from "./branches-manager";

export const dynamic = "force-dynamic";

export default async function AdminBranchesPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.viewBranches, PERMISSIONS.manageBranches])) {
    return <AccessRestricted />;
  }

  const [branches, users] = await Promise.all([
    getAdminBranches(),
    getAdminUsers(),
  ]);

  return <BranchesManager initialBranches={branches} users={users} />;
}
