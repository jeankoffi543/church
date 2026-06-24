import { getAdminMe, getAdminContactsPaginated, getAdminSettings } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../_components/access-restricted";
import { ContactsManager, CONTACTS_PER_PAGE } from "./contacts-manager";

export const dynamic = "force-dynamic";

export default async function AdminContactsPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.viewContacts])) {
    return <AccessRestricted />;
  }

  const [list, pending, settings] = await Promise.all([
    getAdminContactsPaginated({ perPage: CONTACTS_PER_PAGE }),
    getAdminContactsPaginated({ filters: { status: "pending" }, perPage: 1 }),
    getAdminSettings(),
  ]);
  const contactSubjects = (settings.contact?.contact_subjects as string[] | undefined) ?? [
    "Question générale",
    "Sujet de prière",
    "Témoignage",
    "Autre",
  ];

  return (
    <ContactsManager
      initialMessages={list.data}
      initialMeta={list.meta}
      initialPendingCount={pending.meta.total}
      initialSubjects={contactSubjects}
      me={me!}
    />
  );
}
