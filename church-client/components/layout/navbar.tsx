"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/data";
import { Logo } from "./logo";
import { BrandButton } from "@/components/ui/brand-button";
import { LiveDot } from "@/components/ui/live-dot";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={cn(
        "relative rounded-[9px] px-3.5 py-[9px] text-sm font-semibold transition-colors",
        active
          ? "text-indigo"
          : "text-body-strong hover:bg-indigo-mid/[0.06] hover:text-indigo"
      )}
    >
      {label}
      {active && (
        <span className="absolute right-3.5 bottom-[3px] left-3.5 h-0.5 rounded-full bg-gold-dark" />
      )}
    </Link>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const checkLive = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
        const res = await fetch(`${apiUrl}/public/settings?group=live`, {
          headers: { Accept: "application/json" },
        });
        if (res.ok) {
          const json = await res.json();
          setIsLive(Boolean(json.data?.live_status));
        }
      } catch {
        // fail silently
      }
    };
    checkLive();
    const interval = setInterval(checkLive, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-[rgba(40,25,80,0.08)] bg-cream/85 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-[1240px] items-center gap-[22px] px-6">
        <Logo />

        {/* Desktop navigation */}
        <nav className="ml-3.5 hidden gap-0.5 lg:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-3 lg:flex">
          {isLive ? (
            <BrandButton asChild variant="live" size="sm">
              <Link href="/live">
                <LiveDot className="size-2" />
                EN DIRECT
              </Link>
            </BrandButton>
          ) : (
            <Link
              href="/live"
              className="flex items-center gap-2 rounded-[9px] border border-[rgba(40,25,80,0.12)] bg-white/50 px-3.5 py-2 text-[13px] font-bold text-body-strong transition hover:bg-white/80"
            >
              <span className="size-2 rounded-full bg-body/40" />
              HORS LIGNE
            </Link>
          )}
          <BrandButton asChild variant="gold" size="sm">
            <Link href="/dons">Donner</Link>
          </BrandButton>
        </div>

        {/* Mobile actions */}
        <div className="ml-auto flex items-center gap-2.5 lg:hidden">
          {isLive ? (
            <BrandButton asChild variant="live" size="sm" className="px-3 py-2">
              <Link href="/live">
                <LiveDot className="size-1.5" />
                LIVE
              </Link>
            </BrandButton>
          ) : (
            <Link
              href="/live"
              className="flex items-center gap-1.5 rounded-[9px] border border-[rgba(40,25,80,0.12)] bg-white/50 px-3 py-2 text-[11px] font-bold text-body-strong transition hover:bg-white/80"
            >
              <span className="size-1.5 rounded-full bg-body/40" />
              HORS LIGNE
            </Link>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              className="flex size-[42px] items-center justify-center rounded-[10px] border border-[rgba(40,25,80,0.12)] bg-white text-indigo"
              aria-label="Ouvrir le menu"
            >
              <Menu className="size-[18px]" />
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[min(82vw,330px)] gap-0 border-none bg-cream p-6"
            >
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <nav className="mt-8 flex flex-col">
                {NAV_ITEMS.map((item) => (
                  <SheetClose asChild key={item.href}>
                    <Link
                      href={item.href}
                      className="border-b border-[rgba(40,25,80,0.08)] px-1.5 py-3.5 font-display text-2xl text-indigo italic"
                    >
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
                <SheetClose asChild>
                  <Link
                    href="/live"
                    className={cn(
                      "flex items-center gap-2 border-b border-[rgba(40,25,80,0.08)] px-1.5 py-3.5 font-display text-2xl italic",
                      isLive ? "text-live" : "text-body-strong"
                    )}
                  >
                    {isLive ? (
                      <>
                        En Direct <LiveDot className="size-2.5" />
                      </>
                    ) : (
                      <>
                        Hors Ligne <span className="size-2.5 rounded-full bg-body/30" />
                      </>
                    )}
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <BrandButton asChild variant="gold" size="full" className="mt-4.5">
                    <Link href="/dons">Faire un don</Link>
                  </BrandButton>
                </SheetClose>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
