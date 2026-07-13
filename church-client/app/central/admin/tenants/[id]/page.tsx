import { notFound } from "next/navigation";

import { getPlatformTenant, getPlatformStudioKeys, getPlatformPlans } from "@/lib/platform-api";
import { TenantDetail } from "./tenant-detail";

export const dynamic = "force-dynamic";

export default async function PlatformTenantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let tenant;
  try {
    tenant = await getPlatformTenant(id);
  } catch {
    notFound();
  }

  const [studio, plans] = await Promise.all([
    getPlatformStudioKeys(id).catch(() => ({ keys: [], seats: tenant.studio_seats })),
    getPlatformPlans().catch(() => []),
  ]);

  return <TenantDetail tenant={tenant} studio={studio} plans={plans} />;
}
