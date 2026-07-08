import {
  getAdminMe,
  getAdminFollowUps,
  getAdminConverts,
  getAdminMembers,
  getServants,
} from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../_components/access-restricted";
import { FollowUpsManager } from "./follow-ups-manager";

export const dynamic = "force-dynamic";

export default async function AdminFollowUpsPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.viewFollowups, PERMISSIONS.manageFollowups])) {
    return <AccessRestricted />;
  }

  const [followUps, converts, members, servants] = await Promise.all([
    getAdminFollowUps({ page: 1, perPage: 20, sort: { field: "created_at", dir: "desc" } }),
    getAdminConverts({ page: 1, perPage: 100, sort: { field: "decision_date", dir: "desc" } }),
    getAdminMembers({ page: 1, perPage: 100, sort: { field: "created_at", dir: "desc" } }),
    getServants(),
  ]);

  return (
    <FollowUpsManager
      initialData={followUps.data}
      initialMeta={followUps.meta}
      converts={converts.data}
      members={members.data}
      servants={servants}
      canManage={hasAnyPermission(me, [PERMISSIONS.manageFollowups])}
    />
  );
}
