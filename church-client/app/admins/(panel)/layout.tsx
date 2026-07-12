import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";

import { getAdminSession } from "@/lib/auth/session";
import { getAdminMe } from "@/lib/admin-api";
import { getRealtimeChannelPrefix } from "@/lib/api";
import { ADMIN_LOGIN_PATH } from "@/lib/auth/config";
import { logoutAdmin } from "../login/actions";
import { AdminNav } from "./_components/admin-nav";
import { AdminRealtimeNotifier } from "./_components/admin-realtime-notifier";
import { LiveStatusControl } from "./_components/live-status-control";

/** Read the current live status server-side so the top bar renders without a flash. */
async function getInitialLiveStatus(): Promise<boolean> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/public/settings?group=live`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return false;
    const json = await res.json();
    return Boolean(json?.data?.live_status);
  } catch {
    return false;
  }
}

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

  const initialIsLive = await getInitialLiveStatus();
  // Tenant channel prefix for the live back-office notifications (CHR-157).
  const channelPrefix = await getRealtimeChannelPrefix();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — collapsible accordion navigation */}
      <aside className="sticky top-0 z-40 hidden h-screen w-[252px] shrink-0 flex-col bg-ink px-4 py-6 text-white md:flex">
        <Link
          href="/admins/dashboard"
          aria-label="MFM Admin — Tableau de bord"
          className="mb-6 flex items-center gap-3 px-1"
        >
          <Image
            src="/images/logo-no-bg.png"
            alt="Logo MFM"
            width={40}
            height={40}
            className="size-10 shrink-0 object-contain"
          />
          <span className="leading-tight">
            <span className="block font-display text-[17px] font-bold">MFM Admin</span>
            <span className="block text-[9px] font-bold tracking-[0.2em] text-white/40 uppercase">
              Backoffice
            </span>
          </span>
        </Link>

        <AdminNav me={me} />

        <form action={logoutAdmin} className="mt-2 w-full border-t border-white/10 pt-3">
          <button
            type="submit"
            className="flex w-full cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-semibold text-white/70 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut className="size-[18px]" />
            Déconnexion
          </button>
        </form>
      </aside>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar — live status visible on every admin page */}
        <header id="admin-topbar" className="sticky top-0 z-30 flex items-center justify-end gap-3 border-b border-[rgba(40,25,80,0.08)] bg-white/80 px-6 py-3 backdrop-blur-md md:px-10">
          <LiveStatusControl initialIsLive={initialIsLive} />
        </header>

        <main className="flex-1 px-6 py-8 md:px-10 md:py-10">{children}</main>
      </div>

      {/* Live back-office notifications over this church's private channel (CHR-157). */}
      <AdminRealtimeNotifier channelPrefix={channelPrefix} />
    </div>
  );
}
