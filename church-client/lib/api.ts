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
import { tenantApiBase } from "./tenant/api-base";

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
async function apiGet<T>(path: string, tags?: string[], opts?: { noStore?: boolean }): Promise<T | null> {
  try {
    const res = await fetch(`${await tenantApiBase()}${path}`, {
      headers: { Accept: "application/json" },
      // Some views (e.g. the lives archive, updated by the live engine outside
      // Next's cache) must always reflect the latest server state.
      ...(opts?.noStore ? { cache: "no-store" as const } : { next: { revalidate: REVALIDATE, tags } }),
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
  books_category: string[] | null;
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
  dateISO: s.date ?? "",
  duration: s.duration ?? "",
  desc: s.description ?? "",
  mediaType: s.media_type ?? undefined,
  isAudio: s.is_audio,
  // `media_url` already carries the file path for *_file types; resolve it.
  mediaSrc: s.is_file ? assetUrl(s.media_url) : s.media_url,
  background: assetUrl(s.background_image),
  scriptures: s.scriptures ?? [],
  books: s.books_category ?? [],
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

export type GetMinistriesParams = {
  page?: number;
  perPage?: number;
  search?: string;
  sort?: string;
  filters?: Record<string, string>;
};

export async function getMinistries(params?: GetMinistriesParams): Promise<{
  data: Ministry[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}> {
  const query = new URLSearchParams();
  if (params?.page) query.append("page", String(params.page));
  if (params?.perPage) query.append("per_page", String(params.perPage));
  if (params?.search) query.append("search", params.search);
  if (params?.sort) query.append("sort", params.sort);

  if (params?.filters) {
    Object.entries(params.filters).forEach(([key, val]) => {
      query.append(key, val);
    });
  }

  const queryString = query.toString() ? `?${query.toString()}` : "";
  const json = await apiGet<{
    data: ApiMinistry[];
    meta?: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  }>(`/public/ministries${queryString}`, ["ministries"]);

  return {
    data: json?.data ? json.data.map(mapMinistry) : MINISTRIES,
    meta: json?.meta,
  };
}

export type GetSermonsParams = {
  page?: number;
  perPage?: number;
  search?: string;
  speaker?: string[];
  series?: string[];
  year?: string[];
  date?: string[];
  book?: string[];
  filters?: Record<string, string>;
};

export async function getSermons(params?: GetSermonsParams): Promise<{
  data: Sermon[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    speakers: string[];
    series: string[];
    years: string[];
    dates: string[];
    books: string[];
  };
}> {
  const query = new URLSearchParams();
  if (params?.page) query.append("page", String(params.page));
  if (params?.perPage) query.append("per_page", String(params.perPage));
  if (params?.search) query.append("search", params.search);
  if (params?.speaker) params.speaker.forEach((s) => query.append("speaker[]", s));
  if (params?.series) params.series.forEach((s) => query.append("series[]", s));
  if (params?.year) params.year.forEach((y) => query.append("year[]", y));
  if (params?.date) params.date.forEach((d) => query.append("date[]", d));
  if (params?.book) params.book.forEach((b) => query.append("book[]", b));

  if (params?.filters) {
    Object.entries(params.filters).forEach(([key, val]) => {
      query.append(key, val);
    });
  }

  const queryString = query.toString() ? `?${query.toString()}` : "";
  const json = await apiGet<{
    data: ApiSermon[];
    meta?: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
      speakers: string[];
      series: string[];
      years: string[];
      dates: string[];
      books: string[];
    };
  }>(`/public/sermons${queryString}`, ["sermons"]);

  return {
    data: json?.data ? json.data.map(mapSermon) : SERMONS,
    meta: json?.meta,
  };
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

export type GetEventsParams = {
  page?: number;
  perPage?: number;
  search?: string;
  scope?: string;
  featured?: boolean;
  filters?: Record<string, string>;
};

export async function getEvents(params?: GetEventsParams): Promise<{
  data: ChurchEvent[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}> {
  const query = new URLSearchParams();
  if (params?.page) query.append("page", String(params.page));
  if (params?.perPage) query.append("per_page", String(params.perPage));
  if (params?.search) query.append("search", params.search);
  if (params?.scope) query.append("scope", params.scope);
  if (params?.featured !== undefined) query.append("featured", params.featured ? "1" : "0");

  if (params?.filters) {
    Object.entries(params.filters).forEach(([key, val]) => {
      query.append(key, val);
    });
  }

  const queryString = query.toString() ? `?${query.toString()}` : "";
  const json = await apiGet<{
    data: ApiEvent[];
    meta?: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  }>(`/public/events${queryString}`, ["events"]);

  return {
    data: json?.data ? json.data.map(mapEvent) : EVENTS,
    meta: json?.meta,
  };
}

export async function getEvent(slug: string): Promise<ChurchEvent | undefined> {
  const json = await apiGet<{ data: ApiEvent }>(`/public/events/${slug}`, ["events"]);
  return json?.data ? mapEvent(json.data) : getStaticEventBySlug(slug);
}

export type GetHomeGroupsParams = {
  search?: string;
  zone_name?: string;
  day?: string;
  filters?: Record<string, string>;
};

export async function getHomeGroups(params?: GetHomeGroupsParams): Promise<{
  data: HomeGroup[];
  meta?: {
    zones: string[];
    days: string[];
  };
}> {
  const query = new URLSearchParams();
  if (params?.search) query.append("search", params.search);
  if (params?.zone_name) query.append("zone_name", params.zone_name);
  // Send the day verbatim — the API matches it case-insensitively against the
  // stored value (e.g. "Mardi"). Upper-casing it here broke the exact match.
  if (params?.day) {
    query.append("day", params.day);
  }

  if (params?.filters) {
    Object.entries(params.filters).forEach(([key, val]) => {
      query.append(key, val);
    });
  }

  const queryString = query.toString() ? `?${query.toString()}` : "";
  const json = await apiGet<{
    data: ApiHomeGroup[];
    meta?: {
      zones: string[];
      days: string[];
    };
  }>(`/public/home-groups${queryString}`, ["home-groups"]);

  return {
    data: json?.data ? json.data.map(mapHomeGroup) : HOME_GROUPS,
    meta: json?.meta ?? {
      zones: Array.from(new Set(HOME_GROUPS.map((g) => g.zone).filter(Boolean))) as string[],
      days: Array.from(new Set(HOME_GROUPS.map((g) => g.day).filter(Boolean))) as string[],
    },
  };
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

export type BoutiqueSettings = {
  storeCatalogTitle: string;
  storeCatalogDescription: string;
  deliveryOptions: Array<{ key: string; label: string; desc: string; price: number; icon: string }>;
};

export async function getBoutiqueSettings(): Promise<BoutiqueSettings> {
  const boutique = await getSettingsGroup("boutique");
  return {
    storeCatalogTitle: (boutique?.store_catalog_title as string) ?? "Espace Catalogue Fidèles",
    storeCatalogDescription:
      (boutique?.store_catalog_description as string) ??
      "Retrouvez nos livres d'étude, vêtements « Génération Feu » et articles d'onction pour édifier votre marche spirituelle.",
    deliveryOptions: (boutique?.delivery_options as Array<{ key: string; label: string; desc: string; price: number; icon: string }>) ?? [
      { key: "retrait", label: "Retrait à l'église", desc: "Retrait gratuit à MFM Ficgayo", price: 0, icon: "⛪" },
      { key: "abidjan", label: "Livraison Abidjan", desc: "Livraison à domicile à Abidjan", price: 3000, icon: "🛵" },
      { key: "interieur", label: "Livraison intérieur", desc: "Expédition dans les villes de l'intérieur", price: 5000, icon: "📦" }
    ],
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

export type OfferingPitch = {
  eyebrow: string;
  title: string;
  quote: string;
  reference: string;
  points: string[];
};

export type OfferingConfig = {
  purposes: DonationPurpose[];
  presets: number[];
  methods: string[];
  currency: string;
  pitch: OfferingPitch;
};

const DEFAULT_PITCH: OfferingPitch = {
  eyebrow: "Générosité",
  title: "Semer pour la moisson",
  quote: "« Que chacun donne comme il l'a résolu dans son cœur, avec joie. »",
  reference: "2 Corinthiens 9.7",
  points: [
    "Transactions chiffrées & 100% sécurisées",
    "Reçu envoyé automatiquement par e-mail",
    "Gestion transparente, rapport annuel public",
  ],
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
    pitch: {
      eyebrow: (offerings?.offering_pitch_eyebrow as string) ?? DEFAULT_PITCH.eyebrow,
      title: (offerings?.offering_pitch_title as string) ?? DEFAULT_PITCH.title,
      quote: (offerings?.offering_pitch_quote as string) ?? DEFAULT_PITCH.quote,
      reference: (offerings?.offering_pitch_reference as string) ?? DEFAULT_PITCH.reference,
      points: (offerings?.offering_pitch_points as string[] | undefined) ?? DEFAULT_PITCH.points,
    },
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

export type PastorWordShowcase = {
  user_id: number;
  custom_title: string;
  word: string;
  photo_path: string | null;
  social_links: {
    facebook?: string;
    instagram?: string;
    youtube?: string;
  };
  user_name: string | null;
};

export async function getPastorWordShowcase(): Promise<PastorWordShowcase | null> {
  const json = await apiGet<{ data: PastorWordShowcase }>("/public/settings/pastor_word_showcase", ["settings", "settings-pastor_word_showcase"]);
  if (!json?.data) return null;

  const data = json.data;
  return {
    ...data,
    photo_path: data.photo_path ? assetUrl(data.photo_path) : null,
  };
}

export type ChurchPresentationBanner = {
  eyebrow: string;
  quote: string;
  short_description: string;
  button_text: string;
};

export type PastorLongMessage = {
  preacher_id: number;
  custom_eyebrow: string;
  custom_title: string;
  guarantees_title: string;
  guarantees_list: string[];
  html_content: string;
  preacher_name?: string | null;
  preacher_role?: string | null;
  preacher_initials?: string | null;
  preacher_photo_path?: string | null;
};

export type ChurchPillarsVision = {
  title: string;
  intro: string;
  pillars: Array<{
    title: string;
    desc: string;
    icon_name: "Flame" | "ShieldCheck" | "HeartHandshake";
  }>;
};

export type ChurchPastoralTeam = {
  title: string;
  intro: string;
  member_ids: number[];
  pastors?: Array<{
    id: number;
    name: string;
    email: string;
    role: string;
    initials: string;
    photo_path: string | null;
  }>;
};

export async function getChurchPresentationBanner(): Promise<ChurchPresentationBanner | null> {
  const json = await apiGet<{ data: ChurchPresentationBanner }>("/public/settings/church_presentation_banner", ["settings", "settings-church_presentation_banner"]);
  return json?.data || null;
}

export async function getPastorLongMessage(): Promise<PastorLongMessage | null> {
  const json = await apiGet<{ data: PastorLongMessage }>("/public/settings/pastor_long_message", ["settings", "settings-pastor_long_message"]);
  if (!json?.data) return null;

  const data = json.data;
  return {
    ...data,
    preacher_photo_path: data.preacher_photo_path ? assetUrl(data.preacher_photo_path) : null,
  };
}

export async function getChurchPillarsVision(): Promise<ChurchPillarsVision | null> {
  const json = await apiGet<{ data: ChurchPillarsVision }>("/public/settings/church_pillars_vision", ["settings", "settings-church_pillars_vision"]);
  return json?.data || null;
}

export async function getChurchPastoralTeam(): Promise<ChurchPastoralTeam | null> {
  const json = await apiGet<{ data: ChurchPastoralTeam }>("/public/settings/church_pastoral_team", ["settings", "settings-church_pastoral_team"]);
  if (!json?.data) return null;
  return {
    ...json.data,
    pastors: json.data.pastors?.map((p) => ({
      ...p,
      photo_path: assetUrl(p.photo_path),
    })),
  };
}

export type PublicBranch = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  address: string;
  phone: string;
  hours: string;
  lat: number;
  lng: number;
  website: string | null;
  pastor_id: number | null;
  pastor: {
    id: number;
    name: string;
    email: string;
    initials: string;
  } | null;
};

export async function getBranches(params?: { search?: string }): Promise<PublicBranch[]> {
  const query = new URLSearchParams();
  if (params?.search) query.append("search", params.search);
  const queryString = query.toString() ? `?${query.toString()}` : "";
  const json = await apiGet<{ data: PublicBranch[] }>(`/public/branches${queryString}`, ["branches"]);
  return json?.data || [];
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
    const res = await fetch(`${await tenantApiBase()}/public/home-groups/applications`, {
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
    const res = await fetch(`${await tenantApiBase()}/public/home-groups/applications/verify`, {
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
  const res = await fetch(`${await tenantApiBase()}/public/home-groups/applications/status`, {
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

/* ── Ministry Applications Public Actions ─────────────────────────── */

export async function submitMinistryApplication(data: {
  name: string;
  email: string;
  phone: string;
  ministry_id: number;
  motivation: string;
}): Promise<{
  success: boolean;
  errors?: Record<string, string>;
  message?: string;
}> {
  try {
    const res = await fetch(`${await tenantApiBase()}/public/ministries/applications`, {
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
        errors: json.errors || {},
        message: json.message || "Erreur de validation.",
      };
    }
    return {
      success: true,
      message: json.message || "Votre candidature a été soumise avec succès !",
    };
  } catch {
    return {
      success: false,
      message: "Impossible de se connecter au serveur.",
    };
  }
}

export type MinistryApplicationStatusItem = {
  id: number;
  name: string;
  status: "pending" | "approved" | "rejected";
  decision_note: string | null;
  ministry_name: string;
  created_at: string;
};

export async function checkMinistryApplicationStatus(
  contact: string
): Promise<MinistryApplicationStatusItem[]> {
  try {
    const res = await fetch(`${await tenantApiBase()}/public/ministries/applications/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ contact }),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { data: MinistryApplicationStatusItem[] };
    return body.data || [];
  } catch {
    return [];
  }
}


/* ── Gallery / Portfolio ──────────────────────────────────────────── */

type ApiAlbumPhoto = { id: number; album_id: number; image_path: string; order: number };

type ApiAlbum = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  cover_image: string | null;
  category: string;
  event_title: string | null;
  year: string | null;
  date_label: string | null;
  photos_count: number;
  photos?: ApiAlbumPhoto[];
};

export type GalleryPhoto = { id: number; src: string; order: number };

export type GalleryAlbum = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  cover: string | null;
  category: string;
  year: string;
  dateLabel: string;
  photosCount: number;
  photos: GalleryPhoto[];
};

const mapAlbumPhoto = (p: ApiAlbumPhoto): GalleryPhoto => ({
  id: p.id,
  src: assetUrl(p.image_path) ?? "",
  order: p.order,
});

const mapAlbum = (a: ApiAlbum): GalleryAlbum => ({
  id: a.id,
  title: a.title,
  slug: a.slug,
  description: a.description,
  cover: assetUrl(a.cover_image),
  category: a.category,
  year: a.year ?? "",
  dateLabel: a.date_label ?? "",
  photosCount: a.photos_count,
  photos: (a.photos ?? []).map(mapAlbumPhoto),
});

export type GetAlbumsParams = {
  page?: number;
  perPage?: number;
  search?: string;
  category?: string;
  year?: number;
  filters?: Record<string, string>;
};

export async function getAlbums(params?: GetAlbumsParams): Promise<{
  data: GalleryAlbum[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}> {
  const query = new URLSearchParams();
  if (params?.page) query.append("page", String(params.page));
  if (params?.perPage) query.append("per_page", String(params.perPage));
  if (params?.search) query.append("search", params.search);
  if (params?.category) query.append("category", params.category);
  if (params?.year) query.append("year", String(params.year));

  if (params?.filters) {
    Object.entries(params.filters).forEach(([key, val]) => {
      query.append(key, val);
    });
  }

  const queryString = query.toString() ? `?${query.toString()}` : "";
  const json = await apiGet<{
    data: ApiAlbum[];
    meta?: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  }>(`/public/albums${queryString}`, ["albums"]);

  return {
    data: json?.data ? json.data.map(mapAlbum) : [],
    meta: json?.meta,
  };
}

export async function getAlbum(slug: string): Promise<GalleryAlbum | null> {
  const json = await apiGet<{ data: ApiAlbum }>(`/public/albums/${slug}`, ["albums"]);
  return json?.data ? mapAlbum(json.data) : null;
}

/* ── Past lives (VOD archive) ─────────────────────────────────────── */

type ApiPastLive = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  youtube_id: string | null;
  thumbnail_path: string | null;
  series_name: string | null;
  preacher: string | null;
  views_count: number;
  duration: string | null;
  broadcasted_at: string | null;
  date_label: string | null;
  month_label: string | null;
  media_type: SermonMediaType | null;
  media_src: string | null;
  has_chat?: boolean;
  source_type?: "live_archive" | "upload";
};

export type PastLive = {
  id: number;
  title: string;
  slug: string;
  description: string;
  thumbnail: string | null;
  series: string | null;
  preacher: string | null;
  views: number;
  duration: string;
  dateLabel: string;
  monthLabel: string;
  mediaType: SermonMediaType | null;
  mediaSrc: string | null;
  youtubeId: string | null;
  hasChat: boolean;
  fromLive: boolean;
};

const mapPastLive = (l: ApiPastLive): PastLive => ({
  id: l.id,
  title: l.title,
  slug: l.slug,
  description: l.description ?? "",
  thumbnail: assetUrl(l.thumbnail_path),
  series: l.series_name,
  preacher: l.preacher,
  views: l.views_count,
  duration: l.duration ?? "",
  dateLabel: l.date_label ?? "",
  monthLabel: l.month_label ?? "",
  mediaType: l.media_type,
  // Files come back as a relative stream route; resolve to the API origin.
  mediaSrc: l.media_type === "video_file" ? assetUrl(l.media_src) : l.media_src,
  youtubeId: l.youtube_id,
  hasChat: Boolean(l.has_chat),
  fromLive: l.source_type === "live_archive",
});

export async function getPastLives(): Promise<PastLive[]> {
  // Fetch the whole archive so the client can group by month, filter by series /
  // year and "load more" without extra round-trips.
  const json = await apiGet<{ data: ApiPastLive[] }>("/public/past-lives?per_page=500", ["past-lives"], { noStore: true });
  return json?.data ? json.data.map(mapPastLive) : [];
}

export async function getLatestPastLive(): Promise<PastLive | null> {
  const json = await apiGet<{ data: ApiPastLive }>("/public/past-lives/latest", ["past-lives"], { noStore: true });
  return json?.data ? mapPastLive(json.data) : null;
}

export async function getStoreProduct(id: string): Promise<any | null> {
  const json = await apiGet<{ data: any }>(`/public/store/products/${id}`, ["products"]);
  return json?.data ?? null;
}
