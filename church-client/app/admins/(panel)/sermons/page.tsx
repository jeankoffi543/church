import { getAdminMe, getAdminSermonsPaginated, getAdminUsers } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../_components/access-restricted";
import { SermonsManager, SERMONS_PER_PAGE } from "./sermons-manager";

export const dynamic = "force-dynamic";

export default async function AdminSermonsPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.manageSermons])) {
    return <AccessRestricted />;
  }

  const [list, users] = await Promise.all([
    getAdminSermonsPaginated({ perPage: SERMONS_PER_PAGE }),
    getAdminUsers(),
  ]);

  return (
    <SermonsManager
      initialSermons={list.data}
      initialMeta={list.meta}
      preachers={users.map((u) => ({ id: u.id, name: u.name }))}
    />
  );
}
