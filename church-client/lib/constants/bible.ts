// The 66 books of the Bible (Louis Segond), in canonical order.
// Immutable source of truth for the sermon "Livres bibliques" multi-select and
// the public médiathèque filters.

export const OLD_TESTAMENT = [
  "Genèse",
  "Exode",
  "Lévitique",
  "Nombres",
  "Deutéronome",
  "Josué",
  "Juges",
  "Ruth",
  "1 Samuel",
  "2 Samuel",
  "1 Rois",
  "2 Rois",
  "1 Chroniques",
  "2 Chroniques",
  "Esdras",
  "Néhémie",
  "Esther",
  "Job",
  "Psaumes",
  "Proverbes",
  "Ecclésiaste",
  "Cantique des cantiques",
  "Ésaïe",
  "Jérémie",
  "Lamentations",
  "Ézéchiel",
  "Daniel",
  "Osée",
  "Joël",
  "Amos",
  "Abdias",
  "Jonas",
  "Michée",
  "Nahum",
  "Habacuc",
  "Sophonie",
  "Aggée",
  "Zacharie",
  "Malachie",
] as const;

export const NEW_TESTAMENT = [
  "Matthieu",
  "Marc",
  "Luc",
  "Jean",
  "Actes",
  "Romains",
  "1 Corinthiens",
  "2 Corinthiens",
  "Galates",
  "Éphésiens",
  "Philippiens",
  "Colossiens",
  "1 Thessaloniciens",
  "2 Thessaloniciens",
  "1 Timothée",
  "2 Timothée",
  "Tite",
  "Philémon",
  "Hébreux",
  "Jacques",
  "1 Pierre",
  "2 Pierre",
  "1 Jean",
  "2 Jean",
  "3 Jean",
  "Jude",
  "Apocalypse",
] as const;

/** All 66 books, Genèse → Apocalypse. */
export const BIBLE_BOOKS = [...OLD_TESTAMENT, ...NEW_TESTAMENT] as const;

export type BibleBook = (typeof BIBLE_BOOKS)[number];

/** Accent-insensitive, lowercased key for searching/matching book names. */
export function normalizeBook(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
