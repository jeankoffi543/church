import { getAdminMe, getAdminAlbums, getAdminEvents } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../_components/access-restricted";
import { GalleryManager } from "./gallery-manager";

export const dynamic = "force-dynamic";

export default async function AdminGalleryPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.viewGallery, PERMISSIONS.manageGallery])) {
    return <AccessRestricted />;
  }

  const [albums, events] = await Promise.all([getAdminAlbums(), getAdminEvents()]);

  return <GalleryManager initialAlbums={albums} events={events.map((e) => ({ id: e.id, title: e.title }))} />;
}
