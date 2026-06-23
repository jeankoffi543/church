import { getAdminMe, getAdminPastLives, getAdminUsers } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../_components/access-restricted";
import { PastLivesManager } from "./past-lives-manager";

export const dynamic = "force-dynamic";

export default async function AdminPastLivesPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.viewGallery, PERMISSIONS.manageGallery])) {
    return <AccessRestricted />;
  }

  const [lives, users] = await Promise.all([getAdminPastLives(), getAdminUsers()]);

  return <PastLivesManager initialLives={lives} preachers={users} />;
}
