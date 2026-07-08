import { getAdminDashboardSummary } from "@/lib/admin-api";
import type { Period } from "@/components/admin/data/period-picker";
import { DashboardView } from "./dashboard-view";

export const dynamic = "force-dynamic";

/** "Ce mois" — computed server-side; `periodPresets()` lives in a "use client" module. */
function currentMonthPeriod(): Period {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);
  return { from: monthStart, to: today, label: "Ce mois" };
}

export default async function AdminDashboardPage() {
  const initialPeriod = currentMonthPeriod();
  const initialSummary = await getAdminDashboardSummary(initialPeriod.from, initialPeriod.to).catch(() => null);

  return <DashboardView initialSummary={initialSummary} initialPeriod={initialPeriod} />;
}
