import { getAdminMe, getAdminPastorWord } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../../_components/access-restricted";
import { PastorWordForm } from "./pastor-word-form";

export const dynamic = "force-dynamic";

export default async function AdminPastorWordPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.managePastorWord])) {
    return <AccessRestricted />;
  }

  const { pastor_word, users } = await getAdminPastorWord();

  return <PastorWordForm initialData={pastor_word} users={users} />;
}
