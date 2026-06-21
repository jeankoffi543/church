import Image from "next/image";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";

import { getAdminSession } from "@/lib/auth/session";
import { getAdminMe } from "@/lib/admin-api";
import { ADMIN_LOGIN_PATH } from "@/lib/auth/config";
import { logoutAdmin } from "../login/actions";
import { AdminNav } from "./_components/admin-nav";

/**
 * Shell for authenticated admin pages: fixed sidebar + content area.
 * The middleware already gates `/admins/*`, but we re-check here as
 * defense-in-depth (and so Server Components can rely on a session existing).
 */
export default async function AdminPanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getAdminSession();
  if (!session) {
    redirect(ADMIN_LOGIN_PATH);
  }

  // Resolve the administrator's identity + privileges so the sidebar only
  // exposes the departments they are allowed to enter.
  const me = await getAdminMe();
  if (!me) {
    redirect(ADMIN_LOGIN_PATH);
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col bg-ink px-5 py-7 text-white md:flex">
        <div className="mb-8 flex items-center gap-3 px-1">
          <Image
            src="/images/logo-no-bg.png"
            alt="Logo MFM"
            width={40}
            height={40}
            className="size-10 shrink-0 object-contain"
          />
          <span className="leading-tight">
            <span className="block font-display text-[17px] font-bold">
              MFM Admin
            </span>
            <span className="block text-[9px] font-bold tracking-[0.2em] text-white/40 uppercase">
              Backoffice
            </span>
          </span>
        </div>

        <AdminNav me={me} />

        <form action={logoutAdmin} className="mt-auto">
          <button
            type="submit"
            className="flex w-full cursor-pointer items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-sm font-semibold text-white/70 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut className="size-[18px] " />
            Déconnexion
          </button>
        </form>
      </aside>

      {/* Content */}
      <main className="flex-1 px-6 py-8 md:px-10 md:py-10">{children}</main>
    </div>
  );
}
