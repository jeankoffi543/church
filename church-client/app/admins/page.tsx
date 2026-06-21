import { redirect } from "next/navigation";

import { ADMIN_HOME_PATH } from "@/lib/auth/config";

// `/admins` is not a page itself — send authenticated admins to the dashboard.
// (Unauthenticated visitors are redirected to the login by the middleware.)
export default function AdminsIndex() {
  redirect(ADMIN_HOME_PATH);
}
