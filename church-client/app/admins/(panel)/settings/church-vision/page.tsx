import { getAdminMe, getAdminChurchVision } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../../_components/access-restricted";
import { ChurchVisionForm } from "./church-vision-form";

export const dynamic = "force-dynamic";

export default async function AdminChurchVisionPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.manageChurchVision])) {
    return <AccessRestricted />;
  }

  const { church_pillars_vision, church_pastoral_team, users } = await getAdminChurchVision();

  return (
    <ChurchVisionForm
      churchPillarsVision={church_pillars_vision}
      churchPastoralTeam={church_pastoral_team}
      users={users}
    />
  );
}
