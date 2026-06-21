// Centralised content for the MFM Ficgayo site.
// Mirrors the source design data so every page reads from one place.

export type NavItem = {
  href: string;
  label: string;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Accueil" },
  { href: "/mediatheque", label: "Médiathèque" },
  { href: "/eglise", label: "L'Église" },
  { href: "/agenda", label: "Agenda" },
  { href: "/contact", label: "Contact" },
];

/** Church contact details, reused by the footer and the contact page. */
export const CONTACT = {
  address: ["Yopougon Ficgayo", "Abidjan, Côte d'Ivoire"],
  phone: "+225 07 00 00 00 00",
  email: "bonjour@mfm-ficgayo.ci",
  hours: "Dim 9h · Mar 18h30 · Ven 22h",
  mapHint: "Abidjan · Yopougon & environs",
};

/** Subjects offered in the contact form. */
export const CONTACT_SUBJECTS = [
  "Première visite",
  "Prière & accompagnement",
  "Rejoindre un ministère",
  "Groupe de maison",
  "Dons & partenariat",
  "Autre",
];

export type ServiceTime = {
  day: string;
  time: string;
  label: string;
};

export const SERVICE_TIMES: ServiceTime[] = [
  { day: "DIMANCHE", time: "09:00", label: "Culte principal" },
  { day: "MARDI", time: "18:30", label: "Étude biblique" },
  { day: "VENDREDI", time: "22:00", label: "Veillée de prière" },
];

export type Ministry = {
  name: string;
  initial: string;
  desc: string;
  schedule: string;
};

export const MINISTRIES: Ministry[] = [
  {
    name: "Éco-Dim · Enfants",
    initial: "E",
    desc: "Une fondation de foi solide dès le plus jeune âge, à travers le jeu, le chant et la Parole.",
    schedule: "Dimanche · 9h00",
  },
  {
    name: "Jeunesse « Génération Feu »",
    initial: "J",
    desc: "Des jeunes passionnés, équipés pour vivre et partager leur foi sans complexe.",
    schedule: "Samedi · 16h00",
  },
  {
    name: "Couples & Familles",
    initial: "C",
    desc: "Bâtir des foyers solides, ancrés dans l'amour, le pardon et la fidélité.",
    schedule: "1er samedi · 15h00",
  },
  {
    name: "Louange & Adoration",
    initial: "L",
    desc: "Conduire l'assemblée dans la présence de Dieu par le chant et la musique.",
    schedule: "Répét. · Jeudi 18h",
  },
  {
    name: "Intercession",
    initial: "I",
    desc: "Veiller dans la prière et porter l'église et la nation devant Dieu.",
    schedule: "Mardi · 5h00",
  },
];

export type HomeGroup = {
  id?: number;
  name: string;
  area: string;
  when: string;
  leader: string;
  top: string;
  left: string;
};

export const HOME_GROUPS: HomeGroup[] = [
  {
    name: "Cellule Bethel",
    area: "Yopougon Ficgayo",
    when: "Mardi · 19h00",
    leader: "Fr. Jean Koffi",
    top: "46%",
    left: "28%",
  },
  {
    name: "Cellule Sion",
    area: "Cocody Angré",
    when: "Mercredi · 18h30",
    leader: "Sr. Marie Aka",
    top: "30%",
    left: "64%",
  },
  {
    name: "Cellule Emmanuel",
    area: "Abobo",
    when: "Jeudi · 19h00",
    leader: "Fr. Paul Diby",
    top: "20%",
    left: "42%",
  },
  {
    name: "Cellule Shalom",
    area: "Marcory",
    when: "Vendredi · 19h00",
    leader: "Sr. Grâce Obi",
    top: "68%",
    left: "58%",
  },
];

export type ChurchEvent = {
  slug: string;
  day: string;
  month: string;
  title: string;
  type: string;
  time: string;
  fullDate: string;
  location: string;
  host: string;
  description: string;
  highlights: string[];
  image: string;
};

export const EVENTS: ChurchEvent[] = [
  {
    slug: "veillee-toute-la-nuit",
    day: "27",
    month: "JUIN",
    title: "Veillée de prière « Toute la nuit »",
    type: "Veillée",
    time: "22h00 → 05h00",
    fullDate: "Vendredi 27 juin 2026",
    location: "Temple central · Yopougon Ficgayo",
    host: "Département d'intercession",
    description:
      "Une nuit entière dans la présence de Dieu : adoration, intercession et combat spirituel. Nous veillerons ensemble jusqu'à l'aube pour porter l'Église, les familles et la nation devant le trône de la grâce.",
    highlights: [
      "Temps d'adoration prolongée",
      "Intercession ciblée par thèmes",
      "Ministration et prière individuelle",
      "Petit-déjeuner de communion à l'aube",
    ],
    image:
      "https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1400&q=80&auto=format&fit=crop",
  },
  {
    slug: "culte-action-de-grace",
    day: "29",
    month: "JUIN",
    title: "Culte d'action de grâce",
    type: "Culte",
    time: "09h00",
    fullDate: "Dimanche 29 juin 2026",
    location: "Temple central · Yopougon Ficgayo",
    host: "Pasteur David Odion Victor",
    description:
      "Un dimanche pour rendre grâce à Dieu pour sa fidélité. Louange, témoignages et une parole d'encouragement pour clôturer le mois dans la reconnaissance.",
    highlights: [
      "Louange & adoration en direct",
      "Témoignages de la Maison",
      "Message d'action de grâce",
      "Bénédiction des familles",
    ],
    image:
      "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=1400&q=80&auto=format&fit=crop",
  },
  {
    slug: "seminaire-des-couples",
    day: "05",
    month: "JUIL",
    title: "Séminaire des couples",
    type: "Séminaire",
    time: "15h00",
    fullDate: "Samedi 5 juillet 2026",
    location: "Salle des fêtes · Cocody Angré",
    host: "Ministère Couples & Familles",
    description:
      "Un après-midi d'enseignement et d'échange pour bâtir des foyers solides, ancrés dans l'amour, le pardon et la fidélité. Ouvert aux couples mariés et aux fiancés.",
    highlights: [
      "Enseignement biblique sur le couple",
      "Ateliers de communication",
      "Temps d'échange et de prière",
      "Goûter de clôture",
    ],
    image:
      "https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=1400&q=80&auto=format&fit=crop",
  },
  {
    slug: "maison-de-feu-2026",
    day: "11",
    month: "JUIL",
    title: "Conférence « Maison de Feu 2026 »",
    type: "Conférence",
    time: "3 jours · 11–13 juillet",
    fullDate: "11 → 13 juillet 2026",
    location: "Temple central · Yopougon Ficgayo",
    host: "Orateurs invités",
    description:
      "Trois jours de prière, d'adoration et d'enseignement avec des orateurs invités. Le rendez-vous spirituel de l'année pour raviver le feu de l'Esprit et marcher dans une nouvelle dimension de foi.",
    highlights: [
      "Sessions d'enseignement matin & soir",
      "Soirées de réveil et de miracles",
      "Séminaires thématiques par ministère",
      "Orateurs invités nationaux & internationaux",
    ],
    image:
      "https://images.unsplash.com/photo-1519491050282-cf00c82424b4?w=1400&q=80&auto=format&fit=crop",
  },
];

export function getEventBySlug(slug: string): ChurchEvent | undefined {
  return EVENTS.find((e) => e.slug === slug);
}

export type Sermon = {
  title: string;
  speaker: string;
  serie: string;
  book: string;
  date: string;
  duration: string;
};

export const SERMONS: Sermon[] = [
  {
    title: "La grâce qui transforme",
    speaker: "Pasteur David Odion Victor",
    serie: "Vivre par la foi",
    book: "Romains",
    date: "14 juin 2026",
    duration: "48 min",
  },
  {
    title: "Le feu de l'intercession",
    speaker: "Pasteur David Odion Victor",
    serie: "Prière",
    book: "Luc",
    date: "7 juin 2026",
    duration: "52 min",
  },
  {
    title: "Une maison bâtie sur le roc",
    speaker: "Sœur Esther Mbarga",
    serie: "Fondations",
    book: "Matthieu",
    date: "31 mai 2026",
    duration: "39 min",
  },
  {
    title: "Marcher dans la lumière",
    speaker: "Pasteur Daniel Adeyemi",
    serie: "Vivre par la foi",
    book: "1 Jean",
    date: "24 mai 2026",
    duration: "45 min",
  },
  {
    title: "Le Dieu qui restaure",
    speaker: "Sœur Esther Mbarga",
    serie: "Fondations",
    book: "Joël",
    date: "17 mai 2026",
    duration: "41 min",
  },
  {
    title: "Briser les limites",
    speaker: "Pasteur David Odion Victor",
    serie: "Prière",
    book: "Josué",
    date: "10 mai 2026",
    duration: "56 min",
  },
];

export type SermonNote = {
  n: string;
  title: string;
  verse: string;
};

export const SERMON_NOTES: SermonNote[] = [
  {
    n: "01",
    title: "Justifiés par la foi, nous avons la paix avec Dieu",
    verse: "Romains 5.1",
  },
  {
    n: "02",
    title: "Par lui nous avons accès à cette grâce",
    verse: "Romains 5.2",
  },
  {
    n: "03",
    title: "Nous nous glorifions même dans la tribulation",
    verse: "Romains 5.3-4",
  },
  {
    n: "04",
    title: "L'amour de Dieu répandu dans nos cœurs",
    verse: "Romains 5.5",
  },
  {
    n: "05",
    title: "Christ est mort pour nous, pécheurs",
    verse: "Romains 5.8",
  },
];

export type ChatMessage = {
  name: string;
  text: string;
  mod?: boolean;
  you?: boolean;
};

export const INITIAL_CHAT: ChatMessage[] = [
  { name: "Grâce A.", text: "Gloire à Dieu depuis Bouaké !" },
  {
    name: "Modérateur",
    mod: true,
    text: "Bienvenue à tous. Restons bienveillants dans le tchat 🙏",
  },
  { name: "Emmanuel K.", text: "Ce message me touche profondément." },
  { name: "Sarah O.", text: "Amen ! Puissant." },
];

export type DonationPurpose = {
  key: string;
  label: string;
};

export const DONATION_PURPOSES: DonationPurpose[] = [
  { key: "dime", label: "Dîme" },
  { key: "offrande", label: "Offrande" },
  { key: "projet", label: "Projet Maison de Feu" },
  { key: "missions", label: "Missions" },
];

export const DONATION_PRESETS = [2000, 5000, 10000, 20000];

export const FEATURED_SERMON = {
  serie: "Série · Vivre par la foi",
  title: "La grâce qui transforme",
  speaker: "Pasteur David Odion Victor",
  reference: "Romains 5.1-11",
  date: "14 juin 2026",
  duration: "48 min",
  desc: "Pasteur David Odion Victor nous conduit dans Romains 5 pour découvrir comment la grâce de Dieu ne se contente pas de pardonner — elle transforme.",
};

// Image used across hero / player backgrounds.
export const IMG = {
  heroImmersif:
    "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=1700&q=80&auto=format&fit=crop",
  heroSplit:
    "https://images.unsplash.com/photo-1519491050282-cf00c82424b4?w=1300&q=80&auto=format&fit=crop",
  heroEditorial:
    "https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=900&q=80&auto=format&fit=crop",
  latestMessage:
    "https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1100&q=80&auto=format&fit=crop",
  livePlayer:
    "https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=1400&q=80&auto=format&fit=crop",
  agendaFeature:
    "https://images.unsplash.com/photo-1519491050282-cf00c82424b4?w=1100&q=80&auto=format&fit=crop",
};

export function formatFcfa(n: number): string {
  return (n || 0).toLocaleString("fr-FR").replace(/ | /g, " ") + " FCFA";
}

export function formatNumber(n: number): string {
  return (n || 0).toLocaleString("fr-FR").replace(/ | /g, " ");
}
