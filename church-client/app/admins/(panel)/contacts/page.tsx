import { getAdminMe, getAdminContacts, getAdminSettings } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../_components/access-restricted";
import { ContactsManager } from "./contacts-manager";

export const dynamic = "force-dynamic";

export default async function AdminContactsPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.viewContacts])) {
    return <AccessRestricted />;
  }

  const messages = await getAdminContacts();
  const settings = await getAdminSettings();
  const contactSubjects = (settings.contact?.contact_subjects as string[] | undefined) ?? [
    "Question générale",
    "Sujet de prière",
    "Témoignage",
    "Autre",
  ];

  return (
    <ContactsManager
      initialMessages={messages}
      initialSubjects={contactSubjects}
      me={me!}
    />
  );
}
