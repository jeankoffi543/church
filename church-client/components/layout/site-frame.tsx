"use client";

import { usePathname } from "next/navigation";

import { ADMIN_PREFIX } from "@/lib/auth/config";

/**
 * Wraps the public church site with its Navbar + Footer.
 * The admin backoffice (`/admins/*`) renders its own chrome, so the public
 * shell is suppressed there to keep the two zones strictly separated.
 * 
 * Navbar and Footer are passed as props from the Server Layout to avoid
 * coercing them into Client Components.
 */
export function SiteFrame({ 
  children,
  navbar,
  footer
}: { 
  children: React.ReactNode;
  navbar: React.ReactNode;
  footer: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin =
    pathname === ADMIN_PREFIX || pathname.startsWith(ADMIN_PREFIX + "/");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-full flex-col bg-cream">
      {navbar}
      <main className="flex-1">{children}</main>
      {footer}
    </div>
  );
}
