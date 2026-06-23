import { getAdminMe, getAdminDonations, getAdminWebhookEvents } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../_components/access-restricted";
import { FinancesManager } from "./finances-manager";

export const dynamic = "force-dynamic";

export default async function AdminFinancesPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.viewFinances])) {
    return <AccessRestricted />;
  }

  const [donations, webhooks] = await Promise.all([getAdminDonations(), getAdminWebhookEvents()]);

  return <FinancesManager initialDonations={donations} initialWebhooks={webhooks} />;
}
