"use server";

import { getAdminSession } from "@/lib/auth/session";
import { revalidatePath, revalidateTag } from "next/cache";

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || ""}/admin`;

export type AdminMinistry = {
  id: number;
  name: string;
  image: string | null;
  description: string | null;
  schedule: string | null;
  sort_order: number;
  is_active: boolean;
  chef_id: number | null;
  chef: { id: number; name: string; email: string } | null;
};

export type SermonMediaType = "video_url" | "video_file" | "audio_url" | "audio_file";

export type AdminSermon = {
  id: number;
  series: string | null;
  title: string;
  description: string | null;
  speaker: string;
  book: string | null;
  date: string | null;
  preached_at?: string;
  duration: string | null;
  media_type: SermonMediaType | null;
  is_audio: boolean;
  is_file: boolean;
  media_url: string | null;
  media_path: string | null;
  background_image: string | null;
  scriptures: string[];
  is_published: boolean;
};

export type AdminEvent = {
  id: number;
  title: string;
  slug: string;
  type: string | null;
  description: string | null;
  location: string | null;
  host: string | null;
  starts_at: string;
  ends_at: string | null;
  image: string | null;
  highlights: string[] | null;
  is_featured: boolean;
};

export type AdminHomeGroup = {
  id: number;
  name: string;
  leader: string | null;
  leader_id: number | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  zone_name: string | null;
  schedule: string | null;
  coordinates: { top?: string; left?: string; lat?: number; lng?: number } | null;
  sort_order: number;
  is_active: boolean;
};

export async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const session = await getAdminSession();
  const token = session?.token;

  if (!token) {
    throw new Error("UNAUTHORIZED");
  }

  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("UNAUTHORIZED");
    }
    if (res.status === 403) {
      throw new Error("FORBIDDEN");
    }
    const errorText = await res.text();
    let errorJson;
    try {
      errorJson = JSON.parse(errorText);
    } catch {
      // not JSON
    }
    const message = errorJson?.message || errorJson?.error || `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  if (res.status === 204) {
    return null as unknown as T;
  }

  return (await res.json()) as T;
}

/* ── Settings API ────────────────────────────────────────────────── */

export async function getAdminSettings(): Promise<Record<string, Record<string, unknown>>> {
  const response = await adminFetch<{ data: Record<string, Record<string, unknown>> }>("/settings");
  return response.data;
}

export async function updateAdminSettings(
  settings: { key: string; value: unknown; group: string }[],
  files?: Record<string, File | null>
): Promise<unknown> {
  const formData = new FormData();
  formData.append("_method", "PUT");
  formData.append("settings", JSON.stringify(settings));

  if (files) {
    Object.entries(files).forEach(([key, file]) => {
      if (file) {
        formData.append(key, file);
      }
    });
  }

  const result = await adminFetch<unknown>("/settings", {
    method: "POST", // Use POST with _method=PUT to allow PHP to parse multipart/form-data
    body: formData,
  });
  
  // Revalidate public cache
  revalidateTag("settings", { expire: 0 });
  revalidatePath("/");
  revalidatePath("/eglise");
  revalidatePath("/agenda");
  revalidatePath("/dons");
  revalidatePath("/live");
  
  return result;
}

/* ── Ministries CRUD ─────────────────────────────────────────────── */

export async function getAdminMinistries(): Promise<AdminMinistry[]> {
  const response = await adminFetch<{ data: AdminMinistry[] }>("/ministries");
  return response.data;
}

export type MinistryInput = {
  name?: string;
  description?: string | null;
  schedule?: string | null;
  sort_order?: number;
  is_active?: boolean;
  chef_id?: number | null;
};

/** Build multipart form data for a ministry (text fields + optional image). */
function buildMinistryFormData(
  data: MinistryInput,
  image?: File | null,
  removeImage?: boolean
): FormData {
  const fd = new FormData();
  if (data.name !== undefined) fd.append("name", data.name);
  if (data.description !== undefined) fd.append("description", data.description ?? "");
  if (data.schedule !== undefined) fd.append("schedule", data.schedule ?? "");
  if (data.sort_order !== undefined) fd.append("sort_order", String(data.sort_order));
  if (data.is_active !== undefined) fd.append("is_active", data.is_active ? "1" : "0");
  if (data.chef_id !== undefined) fd.append("chef_id", data.chef_id == null ? "" : String(data.chef_id));
  if (image) fd.append("image", image);
  if (removeImage) fd.append("remove_image", "1");
  return fd;
}

function revalidateMinistries() {
  revalidateTag("ministries", { expire: 0 });
  revalidatePath("/");
  revalidatePath("/eglise");
  revalidatePath("/ministeres");
}

export async function createMinistry(
  data: MinistryInput & { name: string },
  image?: File | null
): Promise<{ data: AdminMinistry }> {
  const result = await adminFetch<{ data: AdminMinistry }>("/ministries", {
    method: "POST",
    body: buildMinistryFormData(data, image),
  });
  revalidateMinistries();
  return result;
}

export async function updateMinistry(
  id: number,
  data: MinistryInput,
  image?: File | null,
  removeImage?: boolean
): Promise<{ data: AdminMinistry }> {
  // POST + _method=PUT so PHP parses the multipart body.
  const fd = buildMinistryFormData(data, image, removeImage);
  fd.append("_method", "PUT");
  const result = await adminFetch<{ data: AdminMinistry }>(`/ministries/${id}`, {
    method: "POST",
    body: fd,
  });
  revalidateMinistries();
  return result;
}

export async function deleteMinistry(id: number): Promise<void> {
  await adminFetch<void>(`/ministries/${id}`, {
    method: "DELETE",
  });
  revalidateTag("ministries", { expire: 0 });
  revalidatePath("/");
  revalidatePath("/eglise");
}

/* ── Sermons CRUD ────────────────────────────────────────────────── */

export async function getAdminSermons(): Promise<AdminSermon[]> {
  const response = await adminFetch<{ data: AdminSermon[] }>("/sermons");
  return response.data;
}

export type SermonInput = {
  series?: string | null;
  title?: string;
  description?: string | null;
  speaker?: string;
  book?: string | null;
  preached_at?: string;
  duration?: string | null;
  // `null` → notes-only sermon (no media). Sent as "" and coerced server-side.
  media_type?: SermonMediaType | null;
  media_url?: string | null;
  scriptures?: string[];
  is_published?: boolean;
};

export type SermonFiles = {
  media?: File | null;
  background_image?: File | null;
  remove_background_image?: boolean;
};

/** Build multipart form data for a sermon (text fields, media + cover files). */
function buildSermonFormData(data: SermonInput, files?: SermonFiles): FormData {
  const fd = new FormData();
  if (data.series !== undefined) fd.append("series", data.series ?? "");
  if (data.title !== undefined) fd.append("title", data.title);
  if (data.description !== undefined) fd.append("description", data.description ?? "");
  if (data.speaker !== undefined) fd.append("speaker", data.speaker);
  if (data.book !== undefined) fd.append("book", data.book ?? "");
  if (data.preached_at !== undefined) fd.append("preached_at", data.preached_at);
  if (data.duration !== undefined) fd.append("duration", data.duration ?? "");
  if (data.media_type !== undefined) fd.append("media_type", data.media_type ?? "");
  if (data.media_url !== undefined) fd.append("media_url", data.media_url ?? "");
  if (data.is_published !== undefined) fd.append("is_published", data.is_published ? "1" : "0");
  // Scriptures travel as a JSON string; the backend decodes them.
  if (data.scriptures !== undefined) fd.append("scriptures", JSON.stringify(data.scriptures));
  if (files?.media) fd.append("media", files.media);
  if (files?.background_image) fd.append("background_image", files.background_image);
  if (files?.remove_background_image) fd.append("remove_background_image", "1");
  return fd;
}

function revalidateSermons() {
  revalidateTag("sermons", { expire: 0 });
  revalidatePath("/");
  revalidatePath("/mediatheque");
}

export async function createSermon(
  data: SermonInput & { title: string; speaker: string; preached_at: string; media_type: SermonMediaType | null },
  files?: SermonFiles
): Promise<{ data: AdminSermon }> {
  const result = await adminFetch<{ data: AdminSermon }>("/sermons", {
    method: "POST",
    body: buildSermonFormData(data, files),
  });
  revalidateSermons();
  return result;
}

export async function updateSermon(
  id: number,
  data: SermonInput,
  files?: SermonFiles
): Promise<{ data: AdminSermon }> {
  const fd = buildSermonFormData(data, files);
  fd.append("_method", "PUT");
  const result = await adminFetch<{ data: AdminSermon }>(`/sermons/${id}`, {
    method: "POST",
    body: fd,
  });
  revalidateSermons();
  return result;
}

export async function deleteSermon(id: number): Promise<void> {
  await adminFetch<void>(`/sermons/${id}`, {
    method: "DELETE",
  });
  revalidateTag("sermons", { expire: 0 });
  revalidatePath("/");
  revalidatePath("/mediatheque");
}

/* ── Events CRUD ─────────────────────────────────────────────────── */

export async function getAdminEvents(): Promise<AdminEvent[]> {
  const response = await adminFetch<{ data: AdminEvent[] }>("/events");
  return response.data;
}

export async function checkEventSlug(slug: string, ignoreId?: number): Promise<{ exists: boolean }> {
  const query = new URLSearchParams();
  query.set("slug", slug);
  if (ignoreId !== undefined) {
    query.set("ignore_id", ignoreId.toString());
  }
  return adminFetch<{ exists: boolean }>(`/events/check-slug?${query.toString()}`);
}

export async function createEvent(
  formData: FormData
): Promise<{ data: AdminEvent }> {
  const result = await adminFetch<{ data: AdminEvent }>("/events", {
    method: "POST",
    body: formData,
  });
  revalidateTag("events", { expire: 0 });
  revalidatePath("/");
  revalidatePath("/agenda");
  return result;
}

export async function updateEvent(
  id: number,
  formData: FormData
): Promise<{ data: AdminEvent }> {
  formData.append("_method", "PUT");
  const result = await adminFetch<{ data: AdminEvent }>(`/events/${id}`, {
    method: "POST",
    body: formData,
  });
  revalidateTag("events", { expire: 0 });
  revalidatePath("/");
  revalidatePath("/agenda");
  return result;
}

export async function deleteEvent(id: number): Promise<void> {
  await adminFetch<void>(`/events/${id}`, {
    method: "DELETE",
  });
  revalidateTag("events", { expire: 0 });
  revalidatePath("/");
  revalidatePath("/agenda");
}

/* ── Home Groups CRUD ────────────────────────────────────────────── */

export async function getAdminHomeGroups(): Promise<AdminHomeGroup[]> {
  const response = await adminFetch<{ data: AdminHomeGroup[] }>("/home-groups");
  return response.data;
}

export async function createHomeGroup(data: {
  name: string;
  leader: string | null;
  leader_id?: number | null;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  zone_name?: string | null;
  schedule?: string | null;
  coordinates?: { top?: string; left?: string; lat?: number; lng?: number } | null;
  sort_order?: number;
  is_active?: boolean;
}): Promise<{ data: AdminHomeGroup }> {
  const result = await adminFetch<{ data: AdminHomeGroup }>("/home-groups", {
    method: "POST",
    body: JSON.stringify(data),
  });
  revalidateTag("home-groups", { expire: 0 });
  revalidatePath("/eglise");
  return result;
}

export async function updateHomeGroup(id: number, data: {
  name?: string;
  leader?: string | null;
  leader_id?: number | null;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  zone_name?: string | null;
  schedule?: string | null;
  coordinates?: { top?: string; left?: string; lat?: number; lng?: number } | null;
  sort_order?: number;
  is_active?: boolean;
}): Promise<{ data: AdminHomeGroup }> {
  const result = await adminFetch<{ data: AdminHomeGroup }>(`/home-groups/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  revalidateTag("home-groups", { expire: 0 });
  revalidatePath("/eglise");
  return result;
}

export async function deleteHomeGroup(id: number): Promise<void> {
  await adminFetch<void>(`/home-groups/${id}`, {
    method: "DELETE",
  });
  revalidateTag("home-groups", { expire: 0 });
  revalidatePath("/eglise");
}

/* ── Prayer Requests CRUD ────────────────────────────────────────── */

export type AdminPrayerRequest = {
  id: number;
  name: string | null;
  phone: string;
  email: string;
  category: string;
  message: string;
  status: 'new' | 'praying' | 'answered' | 'archived';
  assigned_to: number | null;
  assignee: { id: number; name: string; email: string } | null;
  pastoral_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminUser = {
  id: number;
  name: string;
  email: string;
};

export async function getAdminPrayers(): Promise<AdminPrayerRequest[]> {
  const response = await adminFetch<{ data: AdminPrayerRequest[] }>("/prayers");
  return response.data;
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const response = await adminFetch<{ data: AdminUser[] }>("/users");
  return response.data;
}

export async function updatePrayerStatus(id: number, status: string): Promise<{ data: AdminPrayerRequest }> {
  return adminFetch<{ data: AdminPrayerRequest }>(`/prayers/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function assignPrayer(id: number, assignedTo: number | null): Promise<{ data: AdminPrayerRequest }> {
  return adminFetch<{ data: AdminPrayerRequest }>(`/prayers/${id}/assign`, {
    method: "PATCH",
    body: JSON.stringify({ assigned_to: assignedTo }),
  });
}

export async function updatePrayer(id: number, data: {
  pastoral_notes?: string | null;
  status?: string;
  assigned_to?: number | null;
}): Promise<{ data: AdminPrayerRequest }> {
  const result = await adminFetch<{ data: AdminPrayerRequest }>(`/prayers/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return result;
}

export async function deletePrayer(id: number): Promise<void> {
  await adminFetch<void>(`/prayers/${id}`, {
    method: "DELETE",
  });
}

/* ── Access control (Groups, Servants, Permissions) ──────────────── */

/** The authenticated administrator's identity + resolved privileges. */
export type AdminMe = {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  is_super_admin: boolean;
  roles: string[];
  permissions: string[];
};

/** A Group / Department with its permission set and member count. */
export type AdminRole = {
  id: number;
  name: string;
  permissions: string[];
  users_count: number;
  created_at: string | null;
};

/** A servant / administrator account with its assigned Groups. */
export type AdminServant = {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  roles: string[];
  created_at: string | null;
};

/** One column-group of the security matrix. */
export type AdminPermissionCategory = {
  category: string;
  permissions: { name: string; label: string }[];
};

/**
 * The currently authenticated administrator, including the flat permission list
 * used to gate the admin UI. Returns `null` when the session is missing/expired.
 */
export async function getAdminMe(): Promise<AdminMe | null> {
  try {
    const response = await adminFetch<{ data: AdminMe }>("/me");
    return response.data;
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return null;
    }
    throw err;
  }
}

/* Groups / Roles */

export async function getAdminRoles(): Promise<AdminRole[]> {
  const response = await adminFetch<{ data: AdminRole[] }>("/roles");
  return response.data;
}

export async function getPermissionCatalog(): Promise<AdminPermissionCategory[]> {
  const response = await adminFetch<{ data: AdminPermissionCategory[] }>("/permissions");
  return response.data;
}

export async function createRole(data: {
  name: string;
  permissions?: string[];
}): Promise<{ data: AdminRole }> {
  return adminFetch<{ data: AdminRole }>("/roles", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateRole(id: number, data: {
  name?: string;
  permissions?: string[];
}): Promise<{ data: AdminRole }> {
  return adminFetch<{ data: AdminRole }>(`/roles/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteRole(id: number): Promise<void> {
  await adminFetch<void>(`/roles/${id}`, { method: "DELETE" });
}

/** Sync the security-matrix selection for one Group in a single call. */
export async function syncRolePermissions(
  id: number,
  permissions: string[]
): Promise<{ data: AdminRole }> {
  return adminFetch<{ data: AdminRole }>(`/roles/${id}/permissions`, {
    method: "PUT",
    body: JSON.stringify({ permissions }),
  });
}

/* Servants / Users */

export async function getServants(): Promise<AdminServant[]> {
  const response = await adminFetch<{ data: AdminServant[] }>("/admin-users");
  return response.data;
}

export async function createServant(data: {
  name: string;
  email: string;
  password: string;
  is_active?: boolean;
  roles?: string[];
}): Promise<{ data: AdminServant }> {
  return adminFetch<{ data: AdminServant }>("/admin-users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateServant(id: number, data: {
  name?: string;
  email?: string;
  password?: string;
  is_active?: boolean;
  roles?: string[];
}): Promise<{ data: AdminServant }> {
  return adminFetch<{ data: AdminServant }>(`/admin-users/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteServant(id: number): Promise<void> {
  await adminFetch<void>(`/admin-users/${id}`, { method: "DELETE" });
}

/* ── Home Groups Applications CRUD ────────────────────────────────── */

export type DecisionPayload = { decision_note: string | null; decision_note_public: boolean };

export type AdminHomeGroupApplication = {
  id: number;
  user_id: number | null;
  name: string;
  email: string;
  phone: string;
  home_group_id: number;
  motivation: string;
  status: "pending" | "approved" | "rejected";
  decision_note: string | null;
  decision_note_public: boolean;
  processed_by: number | null;
  created_at: string;
  updated_at: string;
  home_group?: AdminHomeGroup | null;
  user?: { id: number; name: string; email: string } | null;
  processor?: { id: number; name: string; email: string } | null;
};

export async function getAdminHomeGroupApplications(params?: {
  home_group_id?: number;
  status?: string;
}): Promise<AdminHomeGroupApplication[]> {
  const query = new URLSearchParams();
  if (params?.home_group_id) {
    query.set("home_group_id", params.home_group_id.toString());
  }
  if (params?.status) {
    query.set("status", params.status);
  }
  const queryString = query.toString();
  const path = `/home-groups/applications${queryString ? `?${queryString}` : ""}`;
  const response = await adminFetch<{ data: AdminHomeGroupApplication[] }>(path);
  return response.data;
}

export async function approveHomeGroupApplication(
  id: number,
  decision: DecisionPayload
): Promise<{ data: AdminHomeGroupApplication }> {
  const result = await adminFetch<{ data: AdminHomeGroupApplication }>(`/home-groups/applications/${id}/approve`, {
    method: "POST",
    body: JSON.stringify(decision),
  });
  revalidatePath("/admins/home_groups/applications");
  return result;
}

export async function rejectHomeGroupApplication(
  id: number,
  decision: DecisionPayload
): Promise<{ data: AdminHomeGroupApplication }> {
  const result = await adminFetch<{ data: AdminHomeGroupApplication }>(`/home-groups/applications/${id}/reject`, {
    method: "POST",
    body: JSON.stringify(decision),
  });
  revalidatePath("/admins/home_groups/applications");
  return result;
}

/* ── Ministry recruitment (applications) ─────────────────────────── */

export type AdminMinistryApplication = {
  id: number;
  name: string;
  email: string;
  phone: string;
  motivation: string;
  status: "pending" | "approved" | "rejected";
  decision_note: string | null;
  decision_note_public: boolean;
  ministry_id: number;
  ministry: { id: number; name: string; chef_id: number | null } | null;
  created_at: string | null;
};

export async function getMinistryApplications(): Promise<AdminMinistryApplication[]> {
  const response = await adminFetch<{ data: AdminMinistryApplication[] }>("/ministry-applications");
  return response.data;
}

export async function approveMinistryApplication(
  id: number,
  decision: DecisionPayload
): Promise<{ data: AdminMinistryApplication }> {
  return adminFetch<{ data: AdminMinistryApplication }>(`/ministry-applications/${id}/approve`, {
    method: "POST",
    body: JSON.stringify(decision),
  });
}

export async function rejectMinistryApplication(
  id: number,
  decision: DecisionPayload
): Promise<{ data: AdminMinistryApplication }> {
  return adminFetch<{ data: AdminMinistryApplication }>(`/ministry-applications/${id}/reject`, {
    method: "POST",
    body: JSON.stringify(decision),
  });
}

/* ── Contact Messages CRUD ────────────────────────────────────────── */

export type AdminContactMessage = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: "pending" | "read" | "archived";
  replied_at: string | null;
  replied_by: number | null;
  replied_by_user?: { id: number; name: string; email: string } | null;
  created_at: string;
  updated_at: string;
};

export async function getAdminContacts(): Promise<AdminContactMessage[]> {
  const response = await adminFetch<{ data: AdminContactMessage[] }>("/contacts");
  return response.data;
}

export async function updateContactStatus(
  id: number,
  status: "pending" | "read" | "archived"
): Promise<{ data: AdminContactMessage }> {
  const result = await adminFetch<{ data: AdminContactMessage }>(`/contacts/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  revalidatePath("/admins/contacts");
  return result;
}

export async function archiveContact(id: number): Promise<{ data: AdminContactMessage }> {
  const result = await adminFetch<{ data: AdminContactMessage }>(`/contacts/${id}/archive`, {
    method: "POST",
  });
  revalidatePath("/admins/contacts");
  return result;
}

export async function replyContact(id: number): Promise<{ data: AdminContactMessage }> {
  const result = await adminFetch<{ data: AdminContactMessage }>(`/contacts/${id}/reply`, {
    method: "POST",
  });
  revalidatePath("/admins/contacts");
  return result;
}
