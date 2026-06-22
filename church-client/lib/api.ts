// Server-side data layer that fetches from the Laravel API (church-api).
//
// Every function falls back to the static seed data in `./data` when the API
// is unreachable, so the site keeps rendering even if the backend is down.
// Fetches run in Server Components (no CORS needed) and are cached/revalidated.

import {
  CONTACT,
  CONTACT_SUBJECTS,
  DONATION_PRESETS,
  DONATION_PURPOSES,
  EVENTS,
  FEATURED_SERMON,
  HOME_GROUPS,
  MINISTRIES,
  SERMONS,
  SERVICE_TIMES,
  getEventBySlug as getStaticEventBySlug,
  type ChurchEvent,
  type DonationPurpose,
  type HomeGroup,
  type Ministry,
  type ServiceTime,
  type Sermon,
  type SermonMediaType,
} from "./data";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
/** Origin serving uploaded assets (the API base without the `/api/v1` suffix). */
const ASSET_BASE = API_URL.replace(/\/api\/v1\/?$/, "");

/** Resolve a stored `/storage/...` path to an absolute URL. */
function assetUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${ASSET_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** Revalidate cached API data every 60s (content changes rarely). */
const REVALIDATE = 60;

/**
 * GET a JSON endpoint, returning `null` on any failure (network, non-2xx…).
 */
async function apiGet<T>(path: string, tags?: string[]): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: REVALIDATE, tags },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/* ── Resource shapes returned by the API ──────────────────────────── */

type ApiMinistry = {
  id: number;
  name: string;
  initial: string;
  description: string | null;
  schedule: string | null;
  image: string | null;
};

type ApiSermon = {
  id: number;
  series: string | null;
  title: string;
  description: string | null;
  speaker: string;
  book: string | null;
  date_label: string | null;
  date: string | null;
  duration: string | null;
  media_type: "video_url" | "video_file" | "audio_url" | "audio_file" | null;
  is_audio: boolean;
  is_file: boolean;
  media_url: string | null;
  media_path: string | null;
  background_image: string | null;
  scriptures: string[];
};

type ApiEvent = {
  slug: string;
  title: string;
  type: string | null;
  description: string | null;
  location: string | null;
  host: string | null;
  day: string | null;
  month: string | null;
  time: string | null;
  full_date: string | null;
  highlights: string[] | null;
  image: string | null;
  is_featured: boolean;
};

type ApiHomeGroup = {
  id: number;
  name: string;
  leader: string;
  address: string;
  schedule: string | null;
  latitude: number | null;
  longitude: number | null;
  zone_name: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  coordinates: { top?: string; left?: string } | null;
};

/* ── Mappers (API → front-end types) ──────────────────────────────── */

const mapMinistry = (m: ApiMinistry): Ministry => ({
  id: m.id,
  name: m.name,
  initial: m.initial,
  desc: m.description ?? "",
  schedule: m.schedule ?? "",
  image: m.image ?? null,
});

const mapSermon = (s: ApiSermon): Sermon => ({
  id: s.id,
  title: s.title,
  speaker: s.speaker,
  serie: s.series ?? "",
  book: s.book ?? "",
  date: s.date_label ?? s.date ?? "",
  duration: s.duration ?? "",
  desc: s.description ?? "",
  mediaType: s.media_type ?? undefined,
  isAudio: s.is_audio,
  // `media_url` already carries the file path for *_file types; resolve it.
  mediaSrc: s.is_file ? assetUrl(s.media_url) : s.media_url,
  background: assetUrl(s.background_image),
  scriptures: s.scriptures ?? [],
});

const mapEvent = (e: ApiEvent): ChurchEvent => ({
  slug: e.slug,
  title: e.title,
  type: e.type ?? "",
  time: e.time ?? "",
  day: e.day ?? "",
  month: e.month ?? "",
  fullDate: e.full_date ?? "",
  location: e.location ?? "",
  host: e.host ?? "",
  description: e.description ?? "",
  highlights: e.highlights ?? [],
  image: assetUrl(e.image) ?? "",
  is_featured: !!e.is_featured,
});

const mapHomeGroup = (g: ApiHomeGroup): HomeGroup => ({
  id: g.id,
  name: g.name,
  leader: g.leader,
  area: g.address,
  when: g.schedule ?? "",
  top: g.coordinates?.top ?? "50%",
  left: g.coordinates?.left ?? "50%",
  lat: g.latitude,
  lng: g.longitude,
  zone: g.zone_name,
  day: g.meeting_day,
  time: g.meeting_time,
});

/* ── Resource fetchers ────────────────────────────────────────────── */

export async function getMinistries(): Promise<Ministry[]> {
  const json = await apiGet<{ data: ApiMinistry[] }>("/public/ministries", ["ministries"]);
  return json?.data ? json.data.map(mapMinistry) : MINISTRIES;
}

export async function getSermons(): Promise<Sermon[]> {
  // Fetch a generous page so the médiathèque can paginate/filter client-side.
  const json = await apiGet<{ data: ApiSermon[] }>("/public/sermons?per_page=100", ["sermons"]);
  return json?.data ? json.data.map(mapSermon) : SERMONS;
}

export type LatestSermon = {
  id: number | null;
  serie: string;
  title: string;
  speaker: string;
  reference: string;
  date: string;
  duration: string;
  desc: string;
  mediaType: SermonMediaType | null;
  isAudio: boolean;
  mediaSrc: string | null;
  background: string | null;
  scriptures: string[];
};

export async function getLatestSermon(): Promise<LatestSermon> {
  const json = await apiGet<{ data: ApiSermon }>("/public/sermons/latest", ["sermons"]);
  if (!json?.data) {
    return {
      ...FEATURED_SERMON,
      id: null,
      mediaType: null,
      isAudio: false,
      mediaSrc: null,
      background: null,
      scriptures: [],
    };
  }
  const s = json.data;
  return {
    id: s.id,
    serie: s.series ? `Série · ${s.series}` : FEATURED_SERMON.serie,
    title: s.title,
    speaker: s.speaker,
    reference: s.book ?? FEATURED_SERMON.reference,
    date: s.date_label ?? s.date ?? "",
    duration: s.duration ?? "",
    desc: s.description ?? "",
    mediaType: s.media_type,
    isAudio: s.is_audio,
    mediaSrc: s.is_file ? assetUrl(s.media_url) : s.media_url,
    background: assetUrl(s.background_image),
    scriptures: s.scriptures ?? [],
  };
}

export async function getEvents(): Promise<ChurchEvent[]> {
  const json = await apiGet<{ data: ApiEvent[] }>("/public/events", ["events"]);
  return json?.data ? json.data.map(mapEvent) : EVENTS;
}

export async function getEvent(slug: string): Promise<ChurchEvent | undefined> {
  const json = await apiGet<{ data: ApiEvent }>(`/public/events/${slug}`, ["events"]);
  return json?.data ? mapEvent(json.data) : getStaticEventBySlug(slug);
}

export async function getHomeGroups(): Promise<HomeGroup[]> {
  const json = await apiGet<{ data: ApiHomeGroup[] }>("/public/home-groups", ["home-groups"]);
  return json?.data ? json.data.map(mapHomeGroup) : HOME_GROUPS;
}

/* ── Settings (key-value groups) ──────────────────────────────────── */

type SettingsResponse = {
  data: Record<string, Record<string, unknown>>;
};

async function getSettingsGroup(
  group: string
): Promise<Record<string, unknown> | null> {
  const json = await apiGet<{ data: Record<string, unknown> }>(
    `/public/settings?group=${group}`,
    ["settings", `settings-${group}`]
  );
  return json?.data ?? null;
}

export type HeroContent = {
  eyebrow: string;
  title: string;
  description: string;
  serviceTimes: ServiceTime[];
  isLive: boolean;
  /** Configured hero background (absolute URL), or null to use the default. */
  background: string | null;
  backgroundType: "image" | "video";
};

export async function getHeroContent(): Promise<HeroContent> {
  const general = await getSettingsGroup("general");
  const schedule = await getSettingsGroup("schedule");
  const live = await getSettingsGroup("live");
  const weekly = (schedule?.weekly_schedule as ServiceTime[] | undefined) ?? SERVICE_TIMES;

  return {
    eyebrow: (general?.church_name as string) ?? "✦ Église MFM Ficgayo ✦",
    title: (general?.hero_title as string) ?? "Bienvenue à la Maison",
    description:
      (general?.hero_description as string) ??
      "Un lieu de grâce, de feu et de miracles. Peu importe ton histoire, il y a une place pour toi à cette table.",
    serviceTimes: Array.isArray(weekly) && weekly.length ? weekly : SERVICE_TIMES,
    isLive: Boolean(live?.live_status),
    background: assetUrl((general?.hero_background as string) || null),
    backgroundType: (general?.hero_background_type as string) === "video" ? "video" : "image",
  };
}

export type ContactInfo = {
  address: string[];
  phone: string;
  email: string;
  hours: string;
  mapHint: string;
  socials: { label: string; url: string }[];
  subjects: string[];
  latitude?: number | null;
  longitude?: number | null;
};

export async function getContactInfo(): Promise<ContactInfo> {
  const contact = await getSettingsGroup("contact");
  const address = (contact?.address as string[] | undefined) ?? CONTACT.address;
  const phones = (contact?.phones as string[] | undefined) ?? [CONTACT.phone];
  const emails = (contact?.emails as string[] | undefined) ?? [CONTACT.email];

  return {
    address,
    phone: phones[0] ?? CONTACT.phone,
    email: emails[0] ?? CONTACT.email,
    hours: (contact?.hours as string) ?? CONTACT.hours,
    mapHint: (contact?.map_hint as string) ?? CONTACT.mapHint,
    socials:
      (contact?.socials as { label: string; url: string }[] | undefined) ?? [
        { label: "Facebook", url: "#" },
        { label: "YouTube", url: "#" },
        { label: "Instagram", url: "#" },
      ],
    subjects: (contact?.contact_subjects as string[] | undefined) ?? CONTACT_SUBJECTS,
    latitude: typeof contact?.latitude === "number" ? contact.latitude : (contact?.latitude ? Number(contact.latitude) : null),
    longitude: typeof contact?.longitude === "number" ? contact.longitude : (contact?.longitude ? Number(contact.longitude) : null),
  };
}

export type OfferingConfig = {
  purposes: DonationPurpose[];
  presets: number[];
  methods: string[];
  currency: string;
};

export async function getOfferingConfig(): Promise<OfferingConfig> {
  const offerings = await getSettingsGroup("offerings");

  return {
    purposes:
      (offerings?.offering_types as DonationPurpose[] | undefined) ??
      DONATION_PURPOSES,
    presets:
      (offerings?.offering_presets as number[] | undefined) ?? DONATION_PRESETS,
    methods:
      (offerings?.offering_methods as string[] | undefined) ?? [
        "VISA",
        "Mastercard",
        "Orange Money",
        "Wave",
      ],
    currency: (offerings?.offering_currency as string) ?? "FCFA",
  };
}

export type SermonPoint = {
  id: string;
  text: string;
  verse: string;
};

export type LiveConfig = {
  isLive: boolean;
  streamUrl: string;
  chatEnabled: boolean;
  title: string;
  fallbackImage: string | null;
  description: string;
  sermonTitle: string;
  sermonReference: string;
  sermonPoints: SermonPoint[];
};

export async function getLiveConfig(): Promise<LiveConfig> {
  const live = await getSettingsGroup("live");

  return {
    isLive: Boolean(live?.live_status),
    streamUrl: (live?.live_embed_url as string) ?? "",
    chatEnabled: live?.live_chat_enabled !== false,
    title: (live?.live_title as string) ?? "Culte du dimanche",
    fallbackImage: (live?.live_fallback_image as string) ?? null,
    description: (live?.live_description as string) ?? "Diffusion en direct depuis le temple principal MFM Ficgayo",
    sermonTitle: (live?.live_sermon_title as string) ?? "La grâce qui transforme",
    sermonReference: (live?.live_sermon_reference as string) ?? "Romains 5.1-11",
    sermonPoints: (live?.live_sermon_points as SermonPoint[]) ?? [
      { id: "01", text: "Justifiés par la foi, nous avons la paix avec Dieu", verse: "Romains 5.1" },
      { id: "02", text: "Par lui nous avons accès à cette grâce", verse: "Romains 5.2" },
      { id: "03", text: "Nous nous glorifions même dans la tribulation", verse: "Romains 5.3-4" },
      { id: "04", text: "L’amour de Dieu répandu dans nos cœurs", verse: "Romains 5.5" },
      { id: "05", text: "Christ est mort pour nous, pécheurs", verse: "Romains 5.8" }
    ],
  };
}

// Re-export the settings response type for consumers that need it.
export type { SettingsResponse };

/* ── Home Group Applications Public Actions ─────────────────────── */

export async function submitHomeGroupApplication(data: {
  name: string;
  email: string;
  phone: string;
  home_group_id: number;
  motivation: string;
}): Promise<{
  success: boolean;
  message: string;
  status?: "pending" | "approved" | "rejected";
  home_group_name?: string;
  application?: unknown;
}> {
  try {
    const res = await fetch(`${API_URL}/public/home-groups/applications`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!res.ok) {
      return {
        success: false,
        message: json.message || "Une erreur est survenue lors de l'envoi de la demande.",
        status: json.status,
        home_group_name: json.home_group_name,
      };
    }

    return {
      success: true,
      message: json.message || "Demande soumise avec succès.",
      application: json.application,
    };
  } catch (err) {
    return {
      success: false,
      message: (err as Error).message || "Impossible de se connecter au serveur.",
    };
  }
}

export async function verifyHomeGroupApplication(data: {
  email: string;
  phone: string;
}): Promise<{
  success: boolean;
  status: "pending" | "approved" | "rejected" | "not_found";
  home_group_name?: string;
  application?: unknown;
  message?: string;
}> {
  try {
    const res = await fetch(`${API_URL}/public/home-groups/applications/verify`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (res.status === 404) {
      return {
        success: false,
        status: "not_found",
        message: json.message || "Aucune demande trouvée avec ces coordonnées.",
      };
    }

    if (!res.ok) {
      return {
        success: false,
        status: "not_found",
        message: json.message || "Impossible de vérifier le statut.",
      };
    }

    return {
      success: true,
      status: json.status,
      home_group_name: json.home_group_name,
      application: json.application,
    };
  } catch (err) {
    return {
      success: false,
      status: "not_found",
      message: (err as Error).message || "Impossible de se connecter au serveur.",
    };
  }
}

export type HomeGroupApplicationStatusItem = {
  home_group?: string;
  status: "pending" | "approved" | "rejected";
  decision_note: string | null;
  created_at?: string;
};

export async function checkHomeGroupApplicationStatus(
  contact: string
): Promise<HomeGroupApplicationStatusItem[]> {
  const res = await fetch(`${API_URL}/public/home-groups/applications/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ contact }),
  });

  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.message || "Impossible de vérifier le statut.");
  }

  const body = (await res.json()) as { data: HomeGroupApplicationStatusItem[] };
  return body.data;
}

