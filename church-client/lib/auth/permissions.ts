// Shared, edge-safe permission helpers + constants. Mirrors the granular
// permissions declared on the Laravel side (App\Support\AccessControl) so the
// admin UI can hide/disable what the API would reject anyway. The API remains
// the source of truth — this is convenience gating, not security.

import type { AdminMe } from "@/lib/admin-api";

export const PERMISSIONS = {
  manageSettings: "manage_settings",
  manageLive: "manage_live",
  viewPrayers: "view_prayers",
  processPrayers: "process_prayers",
  managePrayerSettings: "manage_prayer_settings",
  viewCells: "view_cells",
  processCells: "process_cells",
  validateHomeGroupApplications: "validate_home_group_applications",
  manageSermons: "manage_sermons",
  manageEvents: "manage_events",
  manageAccess: "manage_access",
  manageMinistries: "manage_ministries",
  validateMinistryApplications: "validate_ministry_applications",
  viewContacts: "view_contacts",
  manageContacts: "manage_contacts",
  viewGallery: "view_gallery",
  manageGallery: "manage_gallery",
  viewFinances: "view_finances",
  managePastorWord: "manage_pastor_word",
  manageChurchVision: "manage_church_vision",
  viewBranches: "view_branches",
  manageBranches: "manage_branches",
  manageStore: "manage_store",
  viewServices: "view_services",
  manageServices: "manage_services",
  viewMembers: "view_members",
  manageMembers: "manage_members",
  viewAttendance: "view_attendance",
  manageAttendance: "manage_attendance",
  viewEvangelism: "view_evangelism",
  manageEvangelism: "manage_evangelism",
} as const;

export type PermissionName = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** True when the admin holds at least one of the required permissions. */
export function hasAnyPermission(
  me: Pick<AdminMe, "is_super_admin" | "permissions"> | null,
  required: readonly string[]
): boolean {
  if (!me) return false;
  if (me.is_super_admin) return true;
  if (required.length === 0) return true;
  return required.some((p) => me.permissions.includes(p));
}
