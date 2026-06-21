import { getAdminSermons } from "@/lib/admin-api";
import { SermonsManager } from "./sermons-manager";

export const dynamic = "force-dynamic";

export default async function AdminSermonsPage() {
  const sermons = await getAdminSermons();

  return <SermonsManager initialSermons={sermons} />;
}
