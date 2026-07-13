import { getAdminMe, getAdminBilling } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../../_components/access-restricted";
import { BillingManager } from "./billing-manager";

export const dynamic = "force-dynamic";

export default async function AdminBillingPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.manageSettings])) {
    return <AccessRestricted />;
  }

  const billing = await getAdminBilling();

  return <BillingManager initial={billing} adminEmail={me?.email ?? ""} />;
}
