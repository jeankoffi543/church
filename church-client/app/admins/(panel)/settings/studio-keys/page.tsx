import { getAdminMe, getAdminStudioKeys } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { hasFeature, FEATURES } from "@/lib/auth/features";
import { AccessRestricted } from "../../_components/access-restricted";
import { FeatureRestricted } from "../../_components/feature-restricted";
import { StudioKeysManager } from "./studio-keys-manager";

export const dynamic = "force-dynamic";

export default async function AdminStudioKeysPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.manageSettings])) {
    return <AccessRestricted />;
  }
  if (!hasFeature(me, FEATURES.studio)) {
    return <FeatureRestricted />;
  }

  const data = await getAdminStudioKeys();

  return <StudioKeysManager initial={data} />;
}
