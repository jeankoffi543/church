import { getManagedPlans } from "@/lib/platform-api";

import { PlansManager } from "./plans-manager";

export const dynamic = "force-dynamic";

/**
 * Super-admin plan catalogue (CHR-197): the SaaS owner customizes every
 * subscription plan. Backend CRUD is CHR-196.
 */
export default async function PlatformPlansPage() {
  const plans = await getManagedPlans();

  return <PlansManager initial={plans} />;
}
