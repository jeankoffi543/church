import { getPlatformTenants } from "@/lib/platform-api";
import { TenantsList } from "./tenants-list";

export const dynamic = "force-dynamic";

export default async function PlatformTenantsPage() {
  const initial = await getPlatformTenants(1);

  return <TenantsList initial={initial} />;
}
