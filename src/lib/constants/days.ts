/**
 * =============================================================================
 * STAŁE DNI TYGODNIA
 * =============================================================================
 *
 * Centralne definicje dni tygodnia używane w całej aplikacji.
 * Zgodne z JavaScript Date.getDay() gdzie 0 = niedziela.
 */

import type { DayOfWeek } from "@/types";

/**
 * Tablica kluczy dni - indeks odpowiada Date.getDay()
 * 0 = niedziela, 1 = poniedziałek, ..., 6 = sobota
 */
export const DAY_KEYS: readonly DayOfWeek[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
] as const;

/**
 * Mapowanie index -> klucz dnia
 */
export const DAY_KEY_MAP: Record<number, DayOfWeek> = {
    0: "sunday",
    1: "monday",
    2: "tuesday",
    3: "wednesday",
    4: "thursday",
    5: "friday",
    6: "saturday",
};

/**
 * Krótkie polskie nazwy dni (Nd, Pn, Wt...)
 * Indeks odpowiada Date.getDay() - niedziela pierwsza
 */
export const DAY_NAMES_SHORT: readonly string[] = [
    "Nd",
    "Pn",
    "Wt",
    "Śr",
    "Cz",
    "Pt",
    "Sb",
] as const;

/**
 * Pełne polskie nazwy dni
 * Zaczyna od poniedziałku (polski standard)
 */
export const DAY_NAMES_FULL: readonly string[] = [
    "Poniedziałek",
    "Wtorek",
    "Środa",
    "Czwartek",
    "Piątek",
    "Sobota",
    "Niedziela",
] as const;

/**
 * Pełne polskie nazwy dni - zaczyna od niedzieli
 * Indeks odpowiada Date.getDay() - niedziela pierwsza (0)
 */
export const DAY_NAMES_FULL_SUNDAY_FIRST: readonly string[] = [
    "Niedziela",
    "Poniedziałek",
    "Wtorek",
    "Środa",
    "Czwartek",
    "Piątek",
    "Sobota",
] as const;

/**
 * Dni tygodnia z wartościami dla formularzy
 * Zaczyna od poniedziałku (polski standard)
 */
export const DAYS_OF_WEEK = [
    {
        value: 1,
        key: "monday" as const,
        label: "Pon",
        fullLabel: "Poniedziałek",
    },
    { value: 2, key: "tuesday" as const, label: "Wt", fullLabel: "Wtorek" },
    { value: 3, key: "wednesday" as const, label: "Śr", fullLabel: "Środa" },
    { value: 4, key: "thursday" as const, label: "Czw", fullLabel: "Czwartek" },
    { value: 5, key: "friday" as const, label: "Pt", fullLabel: "Piątek" },
    { value: 6, key: "saturday" as const, label: "Sob", fullLabel: "Sobota" },
    { value: 0, key: "sunday" as const, label: "Nd", fullLabel: "Niedziela" },
] as const;

/**
 * Mapowanie angielskich nazw dni na polskie skróty
 */
export const DAY_NAMES_MAP: Record<DayOfWeek, string> = {
    monday: "Pon",
    tuesday: "Wt",
    wednesday: "Śr",
    thursday: "Czw",
    friday: "Pt",
    saturday: "Sob",
    sunday: "Nd",
};

/**
 * Mapowanie angielskich nazw dni na pełne polskie nazwy
 */
export const DAY_NAMES_FULL_MAP: Record<DayOfWeek, string> = {
    monday: "Poniedziałek",
    tuesday: "Wtorek",
    wednesday: "Środa",
    thursday: "Czwartek",
    friday: "Piątek",
    saturday: "Sobota",
    sunday: "Niedziela",
};

/**
 * Konwertuje index dnia (0-6) na klucz
 */
export function dayIndexToKey(index: number): DayOfWeek {
    return DAY_KEYS[index % 7];
}

/**
 * Konwertuje klucz dnia na index (0-6)
 */
export function dayKeyToIndex(key: DayOfWeek): number {
    return DAY_KEYS.indexOf(key);
}
