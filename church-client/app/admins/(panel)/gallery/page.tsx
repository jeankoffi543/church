import { getAdminMe, getAdminAlbumsPaginated, getAdminEvents } from "@/lib/admin-api";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AccessRestricted } from "../_components/access-restricted";
import { GalleryManager, GALLERY_PER_PAGE } from "./gallery-manager";

export const dynamic = "force-dynamic";

export default async function AdminGalleryPage() {
  const me = await getAdminMe();

  if (!hasAnyPermission(me, [PERMISSIONS.viewGallery, PERMISSIONS.manageGallery])) {
    return <AccessRestricted />;
  }

  const [list, events] = await Promise.all([
    getAdminAlbumsPaginated({ perPage: GALLERY_PER_PAGE }),
    getAdminEvents(),
  ]);

  return (
    <GalleryManager
      initialAlbums={list.data}
      initialMeta={list.meta}
      events={events.map((e) => ({ id: e.id, title: e.title }))}
    />
  );
}
