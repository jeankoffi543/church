"use server";

import { getAdminSession } from "@/lib/auth/session";
import { revalidatePath, revalidateTag } from "next/cache";

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || ""}/admin`;

export type AdminMinistry = {
  id: number;
  name: string;
  description: string | null;
  schedule: string | null;
  sort_order: number;
  is_active: boolean;
};

export type AdminSermon = {
  id: number;
  series: string | null;
  title: string;
  description: string | null;
  speaker: string;
  book: string | null;
  preached_at: string;
  duration: string | null;
  video_url: string | null;
  audio_url: string | null;
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
  leader: string;
  address: string;
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

export async function updateAdminSettings(settings: { key: string; value: unknown; group: string }[]): Promise<unknown> {
  const result = await adminFetch<unknown>("/settings", {
    method: "PUT",
    body: JSON.stringify({ settings }),
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

export async function createMinistry(data: {
  name: string;
  description?: string | null;
  schedule?: string | null;
  sort_order?: number;
  is_active?: boolean;
}): Promise<{ data: AdminMinistry }> {
  const result = await adminFetch<{ data: AdminMinistry }>("/ministries", {
    method: "POST",
    body: JSON.stringify(data),
  });
  revalidateTag("ministries", { expire: 0 });
  revalidatePath("/");
  revalidatePath("/eglise");
  return result;
}

export async function updateMinistry(id: number, data: {
  name?: string;
  description?: string | null;
  schedule?: string | null;
  sort_order?: number;
  is_active?: boolean;
}): Promise<{ data: AdminMinistry }> {
  const result = await adminFetch<{ data: AdminMinistry }>(`/ministries/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  revalidateTag("ministries", { expire: 0 });
  revalidatePath("/");
  revalidatePath("/eglise");
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

export async function createSermon(data: {
  series?: string | null;
  title: string;
  description?: string | null;
  speaker: string;
  book?: string | null;
  preached_at: string;
  duration?: string | null;
  video_url?: string | null;
  audio_url?: string | null;
  is_published?: boolean;
}): Promise<{ data: AdminSermon }> {
  const result = await adminFetch<{ data: AdminSermon }>("/sermons", {
    method: "POST",
    body: JSON.stringify(data),
  });
  revalidateTag("sermons", { expire: 0 });
  revalidatePath("/");
  revalidatePath("/mediatheque");
  return result;
}

export async function updateSermon(id: number, data: {
  series?: string | null;
  title?: string;
  description?: string | null;
  speaker?: string;
  book?: string | null;
  preached_at?: string;
  duration?: string | null;
  video_url?: string | null;
  audio_url?: string | null;
  is_published?: boolean;
}): Promise<{ data: AdminSermon }> {
  const result = await adminFetch<{ data: AdminSermon }>(`/sermons/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  revalidateTag("sermons", { expire: 0 });
  revalidatePath("/");
  revalidatePath("/mediatheque");
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

export async function createEvent(data: {
  title: string;
  slug?: string;
  type?: string | null;
  description?: string | null;
  location?: string | null;
  host?: string | null;
  starts_at: string;
  ends_at?: string | null;
  image?: string | null;
  highlights?: string[];
  is_featured?: boolean;
}): Promise<{ data: AdminEvent }> {
  const result = await adminFetch<{ data: AdminEvent }>("/events", {
    method: "POST",
    body: JSON.stringify(data),
  });
  revalidateTag("events", { expire: 0 });
  revalidatePath("/");
  revalidatePath("/agenda");
  return result;
}

export async function updateEvent(id: number, data: {
  title?: string;
  slug?: string;
  type?: string | null;
  description?: string | null;
  location?: string | null;
  host?: string | null;
  starts_at?: string;
  ends_at?: string | null;
  image?: string | null;
  highlights?: string[];
  is_featured?: boolean;
}): Promise<{ data: AdminEvent }> {
  const result = await adminFetch<{ data: AdminEvent }>(`/events/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
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
  leader: string;
  address: string;
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
  leader?: string;
  address?: string;
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
