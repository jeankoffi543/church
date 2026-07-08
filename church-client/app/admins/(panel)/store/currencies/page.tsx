import { getAdminMe, getAdminCurrencies } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../../_components/access-restricted";
import { CurrencyManager } from "./currency-manager";

export const dynamic = "force-dynamic";

export default async function AdminCurrenciesPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.manageStore])) {
    return <AccessRestricted />;
  }

  const currencies = await getAdminCurrencies();

  return <CurrencyManager initialCurrencies={currencies} />;
}
