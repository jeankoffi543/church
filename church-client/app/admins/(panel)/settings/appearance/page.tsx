import { getAdminMe, getAdminSettings } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../../_components/access-restricted";
import { ThemeEditor } from "./theme-editor";

export const dynamic = "force-dynamic";

export default async function AdminAppearancePage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.manageSettings])) {
    return <AccessRestricted />;
  }

  const settings = await getAdminSettings();
  const theme = (settings.theme ?? {}) as Record<string, unknown>;

  return <ThemeEditor initialTheme={theme} />;
}
