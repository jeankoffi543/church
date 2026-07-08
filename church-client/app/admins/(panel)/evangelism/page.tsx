import { getAdminMe, getAdminConverts, getAdminEvangelismCampaigns, getServants } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../_components/access-restricted";
import { EvangelismManager } from "./evangelism-manager";

export const dynamic = "force-dynamic";

export default async function AdminEvangelismPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.viewEvangelism, PERMISSIONS.manageEvangelism])) {
    return <AccessRestricted />;
  }

  const [converts, campaigns, servants] = await Promise.all([
    getAdminConverts({ page: 1, perPage: 20, sort: { field: "decision_date", dir: "desc" } }),
    getAdminEvangelismCampaigns({ page: 1, perPage: 50, sort: { field: "date", dir: "desc" } }),
    getServants(),
  ]);

  return (
    <EvangelismManager
      initialConverts={converts.data}
      initialConvertsMeta={converts.meta}
      initialCampaigns={campaigns.data}
      campaignsMeta={campaigns.meta}
      servants={servants}
      canManage={hasAnyPermission(me, [PERMISSIONS.manageEvangelism])}
    />
  );
}
