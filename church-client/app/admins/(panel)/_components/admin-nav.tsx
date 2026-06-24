"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { ADMIN_NAV_GROUPS, ADMIN_PAGES, resolveActivePath } from "@/lib/admin/registry";
import type { AdminMe } from "@/lib/admin-api";

/**
 * Collapsible accordion sidebar: each thematic section is a header that expands
 * to reveal its pages. The section holding the active page is open by default;
 * the rest stay collapsed so the list never overflows the viewport.
 */
export function AdminNav({ me }: { me: AdminMe | null }) {
  const pathname = usePathname();
  const activePath = resolveActivePath(pathname);

  const visiblePages = ADMIN_PAGES.filter((page) => hasAnyPermission(me, page.permission));
  const activeGroup = visiblePages.find((page) => page.path === activePath)?.group;

  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(activeGroup ? [activeGroup] : []),
  );

  const toggle = (id: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  return (
    <nav className="flex w-full flex-1 flex-col gap-0.5 overflow-y-auto pr-1">
      {ADMIN_NAV_GROUPS.map((group) => {
        const items = visiblePages.filter((page) => page.group === group.id);
        if (items.length === 0) return null;

        const GroupIcon = group.icon;
        const open = openGroups.has(group.id);
        const groupActive = items.some((p) => p.path === activePath);

        return (
          <div key={group.id}>
            <button
              type="button"
              onClick={() => toggle(group.id)}
              aria-expanded={open}
              className={cn(
                "flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-semibold transition-colors",
                groupActive && !open
                  ? "text-gold"
                  : "text-white/70 hover:bg-white/5 hover:text-white",
              )}
            >
              <GroupIcon className="size-[18px] shrink-0" />
              <span className="flex-1 text-left">{group.label}</span>
              <ChevronDown
                className={cn("size-4 shrink-0 transition-transform duration-200", open && "rotate-180")}
              />
            </button>

            {/* grid-rows 1fr/0fr gives a smooth, content-driven height animation. */}
            <div
              className={cn(
                "grid transition-all duration-200 ease-out",
                open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <div className="mt-0.5 mb-1 flex flex-col gap-0.5 pl-4">
                  {items.map((page) => {
                    const Icon = page.icon;
                    const active = page.path === activePath;
                    return (
                      <Link
                        key={page.path}
                        href={page.path}
                        className={cn(
                          "flex items-center gap-3 rounded-[10px] px-3 py-2 text-[13px] font-medium transition-colors",
                          active
                            ? "bg-gold/15 text-gold"
                            : "text-white/55 hover:bg-white/5 hover:text-white",
                        )}
                      >
                        <Icon className="size-[16px] shrink-0" />
                        {page.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
