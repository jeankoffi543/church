"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Settings, 
  Users, 
  Video, 
  CalendarDays, 
  MapPin, 
  HandHeart,
  type LucideIcon 
} from "lucide-react";

import { cn } from "@/lib/utils";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admins/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/admins/ministries", label: "Ministères", icon: Users },
  { href: "/admins/sermons", label: "Prédications (Sermons)", icon: Video },
  { href: "/admins/events", label: "Agenda (Événements)", icon: CalendarDays },
  { href: "/admins/home_groups", label: "Groupes de maison", icon: MapPin },
  { href: "/admins/prayers", label: "Requêtes de prière", icon: HandHeart },
  { href: "/admins/settings", label: "Paramètres", icon: Settings },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-sm font-semibold transition-colors",
              active
                ? "bg-gold/15 text-gold"
                : "text-white/70 hover:bg-white/5 hover:text-white"
            )}
          >
            <Icon className="size-[18px]" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
