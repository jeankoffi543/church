import { getAdminMinistries } from "@/lib/admin-api";
import { MinistriesManager } from "./ministries-manager";

export const dynamic = "force-dynamic";

export default async function AdminMinistriesPage() {
  const ministries = await getAdminMinistries();

  return <MinistriesManager initialMinistries={ministries} />;
}
