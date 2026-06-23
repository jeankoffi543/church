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
  ShieldCheck,
  UserCog,
  Inbox,
  Images,
  Clapperboard,
  MessageSquare,
  Compass,
  Landmark,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminMe } from "@/lib/admin-api";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Any of these permissions grants access (empty = always visible). */
  required: readonly string[];
};

const NAV: NavItem[] = [
  { href: "/admins/dashboard", label: "Tableau de bord", icon: LayoutDashboard, required: [] },
  { href: "/admins/ministries", label: "Ministères", icon: Users, required: [PERMISSIONS.manageSettings] },
  { href: "/admins/sermons", label: "Prédications (Sermons)", icon: Video, required: [PERMISSIONS.manageSermons] },
  { href: "/admins/events", label: "Agenda (Événements)", icon: CalendarDays, required: [PERMISSIONS.manageEvents] },
  { href: "/admins/gallery", label: "Galerie (Albums)", icon: Images, required: [PERMISSIONS.viewGallery, PERMISSIONS.manageGallery] },
  { href: "/admins/past-lives", label: "Archives des lives", icon: Clapperboard, required: [PERMISSIONS.viewGallery, PERMISSIONS.manageGallery] },
  { href: "/admins/home_groups", label: "Groupes de maison", icon: MapPin, required: [PERMISSIONS.viewCells, PERMISSIONS.processCells] },
  { href: "/admins/prayers", label: "Requêtes de prière", icon: HandHeart, required: [PERMISSIONS.viewPrayers, PERMISSIONS.processPrayers] },
  { href: "/admins/contacts", label: "Messages de contact", icon: Inbox, required: [PERMISSIONS.viewContacts] },
  { href: "/admins/branches", label: "Campus & Extensions", icon: Landmark, required: [PERMISSIONS.viewBranches, PERMISSIONS.manageBranches] },
  { href: "/admins/settings/pastor-word", label: "Mot du Pasteur", icon: MessageSquare, required: [PERMISSIONS.managePastorWord] },
  { href: "/admins/settings/church-vision", label: "Vision & Équipe", icon: Compass, required: [PERMISSIONS.manageChurchVision] },
  { href: "/admins/settings", label: "Paramètres", icon: Settings, required: [PERMISSIONS.manageSettings, PERMISSIONS.manageLive, PERMISSIONS.managePrayerSettings] },
];

const ACCESS_NAV: NavItem[] = [
  { href: "/admins/users", label: "Serviteurs", icon: UserCog, required: [PERMISSIONS.manageAccess] },
  { href: "/admins/roles", label: "Groupes & Accès", icon: ShieldCheck, required: [PERMISSIONS.manageAccess] },
];

export function AdminNav({ me }: { me: AdminMe | null }) {
  const pathname = usePathname();

  // Resolve a single active link: the longest href that matches the current
  // path, so a nested route (e.g. /ministries/applications) doesn't also light
  // up its parent (/ministries).
  const activeHref = [...NAV, ...ACCESS_NAV]
    .map((item) => item.href)
    .filter((href) => pathname === href || pathname.startsWith(href + "/"))
    .sort((a, b) => b.length - a.length)[0];

  const renderLink = ({ href, label, icon: Icon }: NavItem) => {
    const active = href === activeHref;
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
  };

  const mainItems = NAV.filter((item) => hasAnyPermission(me, item.required));
  const accessItems = ACCESS_NAV.filter((item) => hasAnyPermission(me, item.required));

  return (
    <nav className="flex flex-col gap-1">
      {mainItems.map(renderLink)}

      {accessItems.length > 0 && (
        <>
          <span className="mt-4 mb-1 px-3.5 text-[9px] font-bold tracking-[0.2em] text-white/30 uppercase">
            Administration
          </span>
          {accessItems.map(renderLink)}
        </>
      )}
    </nav>
  );
}
