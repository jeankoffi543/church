import { getAdminMe, getPreparedVerses, getAdminSettings } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../_components/access-restricted";
import { LiveStudioConsole } from "./live-studio-console";

export const dynamic = "force-dynamic";

export default async function AdminLiveStudioPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.manageLive])) {
    return <AccessRestricted />;
  }

  const prepared = await getPreparedVerses().catch(() => []);
  const settings = await getAdminSettings().catch(() => ({}));

  return <LiveStudioConsole initialPrepared={prepared} initialSettings={settings} />;
}
