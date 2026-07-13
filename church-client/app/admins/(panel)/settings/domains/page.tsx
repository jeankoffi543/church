import { getAdminMe, getAdminDomains } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../../_components/access-restricted";
import { DomainsManager } from "./domains-manager";

export const dynamic = "force-dynamic";

export default async function AdminDomainsPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.manageSettings])) {
    return <AccessRestricted />;
  }

  const domains = await getAdminDomains();

  return <DomainsManager initialDomains={domains} />;
}
