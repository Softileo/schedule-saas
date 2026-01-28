import { PublicHoliday } from "@/types";
import { logger } from "@/lib/utils/logger";
import { formatDateToISO } from "@/lib/utils/date-helpers";

const NAGER_API_BASE = "https://date.nager.at/api/v3";
const DEFAULT_COUNTRY = "PL";

/**
 * Polskie nazwy świąt (mapowanie z angielskich)
 */
const POLISH_HOLIDAY_NAMES: Record<string, string> = {
    "New Year's Day": "Nowy Rok",
    Epiphany: "Święto Trzech Króli",
    "Easter Sunday": "Wielkanoc",
    "Easter Monday": "Poniedziałek Wielkanocny",
    "May Day": "Święto Pracy",
    "Constitution Day": "Święto Konstytucji 3 Maja",
    "Whit Sunday": "Zesłanie Ducha Świętego",
    Pentecost: "Zielone Świątki",
    "Corpus Christi": "Boże Ciało",
    "Assumption Day": "Wniebowzięcie NMP",
    "Assumption of Mary": "Wniebowzięcie NMP",
    "All Saints' Day": "Wszystkich Świętych",
    "Independence Day": "Święto Niepodległości",
    "Christmas Day": "Boże Narodzenie",
    "Second Day of Christmas": "Drugi dzień Świąt",
    "St. Stephen's Day": "Drugi dzień Świąt",
};

/**
 * Oblicza niedziele handlowe dla danego roku wg polskiego prawa.
 * Zgodnie z ustawą z 2024 roku:
 * - Ostatnia niedziela stycznia
 * - 2 niedziele przed Wielkanocą
 * - Ostatnia niedziela czerwca
 * - Ostatnia niedziela sierpnia
 * - 2 ostatnie niedziele grudnia
 */
export function calculateTradingSundays(year: number): string[] {
    const tradingSundays: Set<string> = new Set();

    const formatDate = (date: Date): string => date.toISOString().split("T")[0];

    // Helper: Pobierz ostatnią niedzielę danego miesiąca
    const getLastSundayOfMonth = (y: number, month: number): Date => {
        // month: 0-indexed (0 = styczeń, 3 = kwiecień, itd.)
        const lastDay = new Date(y, month + 1, 0);
        const dayOfWeek = lastDay.getDay();
        const diff = dayOfWeek; // Niedziela to 0 w getDay()
        const lastSunday = new Date(y, month + 1, -diff);
        return lastSunday;
    };

    // 1. MODUŁ STAŁY: Ostatnie niedziele stycznia, kwietnia, czerwca i sierpnia
    [0, 3, 5, 7].forEach((month) => {
        tradingSundays.add(formatDate(getLastSundayOfMonth(year, month)));
    });

    // 2. MODUŁ RUCHOMY: Niedziela przed Wielkanocą (Niedziela Palmowa)
    const getEasterDate = (y: number): Date => {
        const a = y % 19,
            b = Math.floor(y / 100),
            c = y % 100;
        const d = Math.floor(b / 4),
            e = b % 4,
            f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3),
            h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4),
            k = c % 4,
            l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
        const day = ((h + l - 7 * m + 114) % 31) + 1;
        return new Date(y, month, day);
    };

    const easter = getEasterDate(year);
    const sundayBeforeEaster = new Date(easter);
    sundayBeforeEaster.setDate(easter.getDate() - 7);
    tradingSundays.add(formatDate(sundayBeforeEaster));

    // 3. MODUŁ PRZEDŚWIĄTECZNY (GRUDZIEŃ): 3 niedziele przed Wigilią (24.12)
    // Zgodnie z nowelizacją, skoro 24.12 jest wolny, handlowe są 3 niedziele przed nim.
    const christmasEve = new Date(year, 11, 24);
    let daysToSubtract =
        christmasEve.getDay() === 0 ? 7 : christmasEve.getDay();

    // Znajdź pierwszą niedzielę przed Wigilią
    const firstBeforeChristmas = new Date(year, 11, 24 - daysToSubtract);

    for (let i = 0; i < 3; i++) {
        const sunday = new Date(firstBeforeChristmas);
        sunday.setDate(firstBeforeChristmas.getDate() - i * 7);
        tradingSundays.add(formatDate(sunday));
    }

    return Array.from(tradingSundays).sort();
}

// Cache dla obliczonych niedziel handlowych
const tradingSundaysCache = new Map<number, string[]>();

/**
 * Pobiera niedziele handlowe dla danego roku (z cache)
 */
// Zmień nazwę na taką, której używasz w komponencie
export function getTradingSundays(year: number): string[] {
    const tradingSundays = new Set<string>();

    // Helper do formatowania daty na YYYY-MM-DD (ważne dla Twojego porównania w UI!)
    const toISODate = (date: Date) => {
        const offset = date.getTimezoneOffset();
        const adjustedDate = new Date(date.getTime() - offset * 60 * 1000);
        return adjustedDate.toISOString().split("T")[0];
    };

    const getLastSundayOfMonth = (y: number, m: number) => {
        const lastDay = new Date(y, m + 1, 0);
        const diff = lastDay.getDay();
        return new Date(y, m + 1, -diff);
    };

    // 1. Ostatnie niedziele: styczeń, kwiecień, czerwiec, sierpień
    [0, 3, 5, 7].forEach((m) =>
        tradingSundays.add(toISODate(getLastSundayOfMonth(year, m))),
    );

    // 2. Wielkanoc (Niedziela Palmowa)
    const getEaster = (y: number) => {
        const a = y % 19,
            b = Math.floor(y / 100),
            c = y % 100;
        const d = Math.floor(b / 4),
            e = b % 4,
            f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3),
            h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4),
            k = c % 4,
            l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
        const day = ((h + l - 7 * m + 114) % 31) + 1;
        return new Date(y, month, day);
    };
    const palmSunday = getEaster(year);
    palmSunday.setDate(palmSunday.getDate() - 7);
    tradingSundays.add(toISODate(palmSunday));

    // 3. Grudzień - 3 niedziele przed Wigilią (Nowelizacja 2024/2025)
    const christmasEve = new Date(year, 11, 24);
    let daysToSubtract =
        christmasEve.getDay() === 0 ? 7 : christmasEve.getDay();
    const firstBefore = new Date(year, 11, 24 - daysToSubtract);

    for (let i = 0; i < 3; i++) {
        const d = new Date(firstBefore);
        d.setDate(firstBefore.getDate() - i * 7);
        tradingSundays.add(toISODate(d));
    }

    return Array.from(tradingSundays).sort();
}

/**
 * Sprawdza czy data jest niedzielą handlową
 */
export function isTradingSundayDate(date: Date | string): boolean {
    const d = typeof date === "string" ? new Date(date) : date;
    const year = d.getFullYear();
    const dateStr = typeof date === "string" ? date : formatDateToISO(d);
    return getTradingSundays(year).includes(dateStr);
}

/**
 * Tłumaczy nazwę święta na polski
 */
export function translateHolidayName(englishName: string): string {
    return POLISH_HOLIDAY_NAMES[englishName] || englishName;
}

/**
 * Pobiera święta państwowe z API date.nager.at
 */
export async function fetchHolidays(
    year: number,
    countryCode: string = DEFAULT_COUNTRY,
): Promise<PublicHoliday[]> {
    try {
        const response = await fetch(
            `${NAGER_API_BASE}/PublicHolidays/${year}/${countryCode}`,
            { next: { revalidate: 60 * 60 * 24 * 365 } }, // ~rok
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch holidays: ${response.status}`);
        }

        const holidays: PublicHoliday[] = await response.json();

        // Tłumacz nazwy na polski
        return holidays.map((holiday) => ({
            ...holiday,
            name: translateHolidayName(holiday.name),
        }));
    } catch (error) {
        logger.error("Error fetching holidays:", error);
        return [];
    }
}

/**
 * Pobiera święta dla konkretnego miesiąca
 * @param year - Rok
 * @param month - Miesiąc (1-12)
 * @param countryCode - Kod kraju (domyślnie PL)
 */
export async function fetchHolidaysForMonth(
    year: number,
    month: number,
    countryCode: string = DEFAULT_COUNTRY,
): Promise<PublicHoliday[]> {
    const holidays = await fetchHolidays(year, countryCode);

    // Filtruj święta dla danego miesiąca
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

    return holidays.filter((h) => h.date >= startDate && h.date <= endDate);
}

/**
 * Pobiera święta dla wielu lat (bieżący + następny)
 */
export async function fetchHolidaysForYears(
    years: number[],
    countryCode: string = DEFAULT_COUNTRY,
): Promise<Map<number, PublicHoliday[]>> {
    const holidaysMap = new Map<number, PublicHoliday[]>();

    const results = await Promise.all(
        years.map((year) => fetchHolidays(year, countryCode)),
    );

    years.forEach((year, index) => {
        holidaysMap.set(year, results[index]);
    });

    return holidaysMap;
}

/**
 * Sprawdza czy dana data jest świętem
 */
export function isHoliday(
    date: Date | string,
    holidays: PublicHoliday[],
): PublicHoliday | undefined {
    const dateStr = typeof date === "string" ? date : formatDateToISO(date);

    return holidays.find((holiday) => holiday.date === dateStr);
}

/**
 * Pobiera nadchodzące święta (max 5)
 */
export function getUpcomingHolidays(
    holidays: PublicHoliday[],
    fromDate: Date = new Date(),
    limit: number = 5,
): PublicHoliday[] {
    const today = formatDateToISO(fromDate);

    return holidays.filter((holiday) => holiday.date >= today).slice(0, limit);
}

/**
 * Grupuje święta po miesiącach
 */
export function groupHolidaysByMonth(
    holidays: PublicHoliday[],
): Map<number, PublicHoliday[]> {
    const grouped = new Map<number, PublicHoliday[]>();

    holidays.forEach((holiday) => {
        // Parse as local date to avoid timezone issues
        const month = parseInt(holiday.date.split("-")[1], 10);
        const existing = grouped.get(month) || [];
        grouped.set(month, [...existing, holiday]);
    });

    return grouped;
}

/**
 * Statystyki pracy dla roku 2026
 * Źródło: Oficjalne dane o dniach pracy i świętach w Polsce
 */
export interface MonthWorkStatistics {
    month: number;
    monthName: string;
    workingHours: number;
    workingDays: number;
    freeDays: number;
    notes?: string;
}
