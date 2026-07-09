import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with conflict resolution — the same `cn` the web
 * console uses (`@/lib/utils`), so ported components keep their exact call sites. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
