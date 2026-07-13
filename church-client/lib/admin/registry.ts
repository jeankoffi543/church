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
  Wallet,
  Landmark,
  Church,
  RadioTower,
  ShoppingBag,
  Package,
  ClipboardList,
  UsersRound,
  TrendingUp,
  Coins,
  CalendarClock,
  UserRound,
  Flame,
  HeartHandshake,
  Boxes,
  Layers,
  Globe,
  Rocket,
  CreditCard,
  KeyRound,
  Palette,
  type LucideIcon,
} from "lucide-react";

import { PERMISSIONS } from "@/lib/auth/permissions";
import { FEATURES } from "@/lib/auth/features";

/**
 * Single source of truth for the admin backoffice screens. Drives the sidebar
 * (grouped by theme), the active-link resolution, and is available for page
 * titles / breadcrumbs. Add a screen here once — never re-declare it in the nav.
 */

export type AdminNavGroupId = "overview" | "content" | "community" | "church-life" | "finance" | "boutique" | "church" | "admin";

export type AdminPage = {
  key: string;
  path: string;
  label: string;
  icon: LucideIcon;
  /** Any of these permissions grants access (empty = always visible). */
  permission: readonly string[];
  /** Plan feature required for this module; omitted = available on every plan. */
  feature?: string;
  group: AdminNavGroupId;
};

/**
 * Ordered sidebar sections. Each drives one rail item: `short` is the label
 * shown under the icon in the narrow rail, `label` is the flyout panel header.
 */
export const ADMIN_NAV_GROUPS: { id: AdminNavGroupId; label: string; short: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Vue d'ensemble", short: "Accueil", icon: LayoutDashboard },
  { id: "content", label: "Contenu & Diffusion", short: "Contenu", icon: Clapperboard },
  { id: "community", label: "Communauté", short: "Communauté", icon: Users },
  { id: "church-life", label: "Vie de l'Église", short: "Vie d'Église", icon: CalendarClock },
  { id: "finance", label: "Finances", short: "Finances", icon: Wallet },
  { id: "boutique", label: "Boutique", short: "Boutique", icon: ShoppingBag },
  { id: "church", label: "Église & Présentation", short: "Église", icon: Church },
  { id: "admin", label: "Administration", short: "Admin", icon: ShieldCheck },
];

export const ADMIN_PAGES: AdminPage[] = [
  { key: "dashboard", path: "/admins/dashboard", label: "Tableau de bord", icon: LayoutDashboard, permission: [], group: "overview" },
  { key: "onboarding", path: "/admins/onboarding", label: "Démarrage", icon: Rocket, permission: [PERMISSIONS.manageSettings], group: "overview" },

  // Contenu & Diffusion
  { key: "live-studio", path: "/admins/live-studio", label: "Régie Live (Studio)", icon: RadioTower, permission: [PERMISSIONS.manageLive], feature: FEATURES.studio, group: "content" },
  { key: "sermons", path: "/admins/sermons", label: "Prédications (Sermons)", icon: Video, permission: [PERMISSIONS.manageSermons], group: "content" },
  { key: "past-lives", path: "/admins/past-lives", label: "Archives des lives", icon: Clapperboard, permission: [PERMISSIONS.viewGallery, PERMISSIONS.manageGallery], group: "content" },
  { key: "gallery", path: "/admins/gallery", label: "Galerie (Albums)", icon: Images, permission: [PERMISSIONS.viewGallery, PERMISSIONS.manageGallery], group: "content" },
  { key: "events", path: "/admins/events", label: "Agenda (Événements)", icon: CalendarDays, permission: [PERMISSIONS.manageEvents], group: "content" },

  // Communauté
  { key: "home-groups", path: "/admins/home-groups", label: "Groupes de maison", icon: MapPin, permission: [PERMISSIONS.viewCells, PERMISSIONS.processCells], group: "community" },
  { key: "prayers", path: "/admins/prayers", label: "Requêtes de prière", icon: HandHeart, permission: [PERMISSIONS.viewPrayers, PERMISSIONS.processPrayers], group: "community" },
  { key: "contacts", path: "/admins/contacts", label: "Messages de contact", icon: Inbox, permission: [PERMISSIONS.viewContacts], group: "community" },
  { key: "ministries", path: "/admins/ministries", label: "Ministères", icon: Users, permission: [PERMISSIONS.manageSettings], group: "community" },

  // Vie de l'Église
  { key: "services", path: "/admins/services", label: "Cultes", icon: CalendarClock, permission: [PERMISSIONS.viewServices, PERMISSIONS.manageServices], group: "church-life" },
  { key: "members", path: "/admins/members", label: "Fidèles", icon: UserRound, permission: [PERMISSIONS.viewMembers, PERMISSIONS.manageMembers], group: "church-life" },
  { key: "evangelism", path: "/admins/evangelism", label: "Évangélisation", icon: Flame, permission: [PERMISSIONS.viewEvangelism, PERMISSIONS.manageEvangelism], feature: FEATURES.evangelism, group: "church-life" },
  { key: "follow-ups", path: "/admins/follow-ups", label: "Suivi des âmes", icon: HeartHandshake, permission: [PERMISSIONS.viewFollowups, PERMISSIONS.manageFollowups], feature: FEATURES.followups, group: "church-life" },
  { key: "resources", path: "/admins/resources", label: "Logistique", icon: Boxes, permission: [PERMISSIONS.viewResources, PERMISSIONS.manageResources], feature: FEATURES.resources, group: "church-life" },
  { key: "teams", path: "/admins/teams", label: "Équipes de service", icon: Layers, permission: [PERMISSIONS.viewTeams, PERMISSIONS.manageTeams], feature: FEATURES.teams, group: "church-life" },

  // Finances
  { key: "finances", path: "/admins/finances", label: "Finances (Dons)", icon: Wallet, permission: [PERMISSIONS.viewFinances], feature: FEATURES.finances, group: "finance" },

  // Boutique
  { key: "store", path: "/admins/store", label: "Produits", icon: Package, permission: [PERMISSIONS.manageStore], feature: FEATURES.store, group: "boutique" },
  { key: "store-orders", path: "/admins/store/orders", label: "Commandes", icon: ClipboardList, permission: [PERMISSIONS.manageStore], feature: FEATURES.store, group: "boutique" },
  { key: "store-clients", path: "/admins/store/clients", label: "Clients", icon: UsersRound, permission: [PERMISSIONS.manageStore], feature: FEATURES.store, group: "boutique" },
  { key: "store-finance", path: "/admins/store/finance", label: "Finance", icon: TrendingUp, permission: [PERMISSIONS.manageStore], feature: FEATURES.store, group: "boutique" },
  { key: "store-currencies", path: "/admins/store/currencies", label: "Devises", icon: Coins, permission: [PERMISSIONS.manageStore], feature: FEATURES.store, group: "boutique" },

  // Église & Présentation
  { key: "pastor-word", path: "/admins/settings/pastor-word", label: "Mot du Pasteur", icon: MessageSquare, permission: [PERMISSIONS.managePastorWord], group: "church" },
  { key: "church-vision", path: "/admins/settings/church-vision", label: "Vision & Équipe", icon: Compass, permission: [PERMISSIONS.manageChurchVision], group: "church" },
  { key: "appearance", path: "/admins/settings/appearance", label: "Apparence", icon: Palette, permission: [PERMISSIONS.manageSettings], group: "church" },
  { key: "settings", path: "/admins/settings", label: "Paramètres", icon: Settings, permission: [PERMISSIONS.manageSettings, PERMISSIONS.manageLive, PERMISSIONS.managePrayerSettings], group: "church" },
  { key: "billing", path: "/admins/settings/billing", label: "Abonnement", icon: CreditCard, permission: [PERMISSIONS.manageSettings], group: "church" },
  { key: "studio-keys", path: "/admins/settings/studio-keys", label: "Licences Studio", icon: KeyRound, permission: [PERMISSIONS.manageSettings], feature: FEATURES.studio, group: "church" },
  { key: "domains", path: "/admins/settings/domains", label: "Nom de domaine", icon: Globe, permission: [PERMISSIONS.manageSettings], feature: FEATURES.customDomain, group: "church" },
  { key: "branches", path: "/admins/branches", label: "Campus & Extensions", icon: Landmark, permission: [PERMISSIONS.viewBranches, PERMISSIONS.manageBranches], feature: FEATURES.multiCampus, group: "church" },

  // Administration
  { key: "users", path: "/admins/users", label: "Serviteurs", icon: UserCog, permission: [PERMISSIONS.manageAccess], group: "admin" },
  { key: "roles", path: "/admins/roles", label: "Groupes & Accès", icon: ShieldCheck, permission: [PERMISSIONS.manageAccess], group: "admin" },
];

/** The longest registered path matching the current pathname (so a nested route
 *  like /ministries/applications activates /ministries, not nothing). */
export function resolveActivePath(pathname: string): string | undefined {
  return ADMIN_PAGES.map((p) => p.path)
    .filter((path) => pathname === path || pathname.startsWith(path + "/"))
    .sort((a, b) => b.length - a.length)[0];
}
