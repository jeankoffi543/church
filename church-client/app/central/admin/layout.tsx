import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";

import { getPlatformMe } from "@/lib/platform-api";
import { CENTRAL_LOGIN_PATH } from "@/lib/auth/config";
import { logoutPlatform } from "../login/actions";

export const dynamic = "force-dynamic";

/**
 * Shell for the platform super-admin console (CHR-182). The proxy already gates
 * `/central/admin/*` on the platform cookie; we re-resolve the staff identity
 * here as defense-in-depth and to render the header. CHR-183 fills the console.
 */
export default async function PlatformConsoleLayout({ children }: { children: ReactNode }) {
  const me = await getPlatformMe();
  if (!me) {
    redirect(CENTRAL_LOGIN_PATH);
  }

  return (
    <div className="min-h-screen bg-cream text-indigo">
      <header className="sticky top-0 z-40 border-b border-indigo/10 bg-ink text-cream">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-6">
            <Link href="/central/admin" className="flex items-center gap-2 font-display text-lg font-bold">
              <span className="grid size-7 place-items-center rounded-lg bg-gold text-ink">✦</span>
              ChurchApp <span className="font-normal text-cream/50">· Console</span>
            </Link>
            <Link href="/central/admin/tenants" className="hidden text-sm font-semibold text-cream/70 transition hover:text-cream sm:inline">
              Églises
            </Link>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-cream/70 sm:inline">
              {me.name} · <span className="text-gold">{me.role}</span>
            </span>
            <form action={logoutPlatform}>
              <button
                type="submit"
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 font-semibold text-cream/70 transition hover:bg-white/5 hover:text-cream"
              >
                <LogOut className="size-4" /> Déconnexion
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
