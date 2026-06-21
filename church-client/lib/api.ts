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
} from "./data";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

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
  name: string;
  initial: string;
  description: string | null;
  schedule: string | null;
};

type ApiSermon = {
  series: string | null;
  title: string;
  description: string | null;
  speaker: string;
  book: string | null;
  date_label: string | null;
  date: string | null;
  duration: string | null;
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
};

type ApiHomeGroup = {
  name: string;
  leader: string;
  address: string;
  schedule: string | null;
  coordinates: { top?: string; left?: string } | null;
};

/* ── Mappers (API → front-end types) ──────────────────────────────── */

const mapMinistry = (m: ApiMinistry): Ministry => ({
  name: m.name,
  initial: m.initial,
  desc: m.description ?? "",
  schedule: m.schedule ?? "",
});

const mapSermon = (s: ApiSermon): Sermon => ({
  title: s.title,
  speaker: s.speaker,
  serie: s.series ?? "",
  book: s.book ?? "",
  date: s.date_label ?? s.date ?? "",
  duration: s.duration ?? "",
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
  image: e.image ?? "",
});

const mapHomeGroup = (g: ApiHomeGroup): HomeGroup => ({
  name: g.name,
  leader: g.leader,
  area: g.address,
  when: g.schedule ?? "",
  top: g.coordinates?.top ?? "50%",
  left: g.coordinates?.left ?? "50%",
});

/* ── Resource fetchers ────────────────────────────────────────────── */

export async function getMinistries(): Promise<Ministry[]> {
  const json = await apiGet<{ data: ApiMinistry[] }>("/public/ministries", ["ministries"]);
  return json?.data ? json.data.map(mapMinistry) : MINISTRIES;
}

export async function getSermons(): Promise<Sermon[]> {
  const json = await apiGet<{ data: ApiSermon[] }>("/public/sermons", ["sermons"]);
  return json?.data ? json.data.map(mapSermon) : SERMONS;
}

export async function getLatestSermon() {
  const json = await apiGet<{ data: ApiSermon }>("/public/sermons/latest", ["sermons"]);
  if (!json?.data) return FEATURED_SERMON;
  const s = json.data;
  return {
    serie: s.series ? `Série · ${s.series}` : FEATURED_SERMON.serie,
    title: s.title,
    speaker: s.speaker,
    reference: s.book ?? FEATURED_SERMON.reference,
    date: s.date_label ?? s.date ?? "",
    duration: s.duration ?? "",
    desc: s.description ?? "",
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
    subjects: CONTACT_SUBJECTS,
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
