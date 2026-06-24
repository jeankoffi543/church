import { getAdminMe, getAdminPastLivesPaginated, getAdminUsers } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../_components/access-restricted";
import { PastLivesManager, PAST_LIVES_PER_PAGE } from "./past-lives-manager";

export const dynamic = "force-dynamic";

export default async function AdminPastLivesPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.viewGallery, PERMISSIONS.manageGallery])) {
    return <AccessRestricted />;
  }

  const [list, users] = await Promise.all([
    getAdminPastLivesPaginated({ perPage: PAST_LIVES_PER_PAGE }),
    getAdminUsers(),
  ]);

  return <PastLivesManager initialLives={list.data} initialMeta={list.meta} preachers={users} />;
}
