import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalize a string for alphabetical sorting: strips diacritics, lowercases,
 * and removes leading non-alphanumeric characters so "The Beatles" sorts as
 * "beatles" and "¡Ojo!" sorts as "ojo".
 */
export function cleanForSort(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/^[^a-z0-9]+/, "")
    .trim();
}

/**
 * Comparator that sorts Jellyfin item names alphabetically (pt-BR), ignoring
 * accents and leading punctuation.
 */
export function compareItemNames(a: { Name?: string }, b: { Name?: string }): number {
  const nameA = a.Name || "";
  const nameB = b.Name || "";
  const cleanA = cleanForSort(nameA);
  const cleanB = cleanForSort(nameB);
  if (cleanA && cleanB) {
    return cleanA.localeCompare(cleanB, "pt-BR");
  }
  return nameA.toLowerCase().localeCompare(nameB.toLowerCase(), "pt-BR");
}
