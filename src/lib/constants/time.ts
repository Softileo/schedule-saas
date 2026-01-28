/**
 * Centralizacja domyślnych czasów pracy i godzin otwarcia
 *
 * Używać zamiast hardcoded stringów dla:
 * - Spójności w całej aplikacji
 * - Łatwiejszej zmiany wartości domyślnych
 * - Unikania literówek
 */

import type { DayOpeningHours, OpeningHours } from "@/types";

/**
 * Domyślne czasy zmian pracowniczych
 */
export const DEFAULT_SHIFT_TIME = {
    START: "08:00",
    END: "16:00",
} as const;

/**
 * Domyślne godziny otwarcia sklepu (pojedyncze wartości)
 */
export const DEFAULT_OPENING_HOURS = {
    OPEN: "09:00",
    CLOSE: "21:00",
} as const;

/**
 * Domyślne godziny dla weekendu
 */
export const DEFAULT_WEEKEND_HOURS = {
    OPEN: "10:00",
    CLOSE: "18:00",
} as const;

/**
 * Pełna domyślna struktura godzin otwarcia dla całego tygodnia
 * Używać w formularzach i jako wartość domyślna dla nowych organizacji
 */
export const DEFAULT_WEEKLY_OPENING_HOURS: OpeningHours = {
    monday: {
        enabled: true,
        open: DEFAULT_OPENING_HOURS.OPEN,
        close: DEFAULT_OPENING_HOURS.CLOSE,
    },
    tuesday: {
        enabled: true,
        open: DEFAULT_OPENING_HOURS.OPEN,
        close: DEFAULT_OPENING_HOURS.CLOSE,
    },
    wednesday: {
        enabled: true,
        open: DEFAULT_OPENING_HOURS.OPEN,
        close: DEFAULT_OPENING_HOURS.CLOSE,
    },
    thursday: {
        enabled: true,
        open: DEFAULT_OPENING_HOURS.OPEN,
        close: DEFAULT_OPENING_HOURS.CLOSE,
    },
    friday: {
        enabled: true,
        open: DEFAULT_OPENING_HOURS.OPEN,
        close: DEFAULT_OPENING_HOURS.CLOSE,
    },
    saturday: {
        enabled: true,
        open: DEFAULT_OPENING_HOURS.OPEN,
        close: DEFAULT_OPENING_HOURS.CLOSE,
    },
    sunday: {
        enabled: false,
        open: DEFAULT_WEEKEND_HOURS.OPEN,
        close: DEFAULT_WEEKEND_HOURS.CLOSE,
    },
};

/**
 * Helper do tworzenia godzin dla pojedynczego dnia
 */
export function createDayHours(
    enabled: boolean,
    open: string = DEFAULT_OPENING_HOURS.OPEN,
    close: string = DEFAULT_OPENING_HOURS.CLOSE
): DayOpeningHours {
    return { enabled, open, close };
}

/**
 * Stałe czasowe w milisekundach
 */
export const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const MS_PER_HOUR = 60 * 60 * 1000;
export const MS_PER_MINUTE = 60 * 1000;

/**
 * Type helper dla godzin
 */
export type TimeString = `${string}:${string}`;
