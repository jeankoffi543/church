import { getAdminMe, getAdminMinistries } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../_components/access-restricted";
import { MinistriesManager } from "./ministries-manager";

export const dynamic = "force-dynamic";

export default async function AdminMinistriesPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.manageSettings])) {
    return <AccessRestricted />;
  }

  const ministries = await getAdminMinistries();

  return <MinistriesManager initialMinistries={ministries} />;
}
