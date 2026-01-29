import {
    format,
    parseISO,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    addMonths,
    subMonths,
} from "date-fns";
import { pl } from "date-fns/locale";

// Re-export format dla użycia w innych plikach
export { format, startOfWeek, endOfWeek } from "date-fns";

// Re-export z constants dla kompatybilności wstecznej i spójności
export { DAY_NAMES_MAP } from "@/lib/constants/days";

export const MONTH_NAMES = [
    "Styczeń",
    "Luty",
    "Marzec",
    "Kwiecień",
    "Maj",
    "Czerwiec",
    "Lipiec",
    "Sierpień",
    "Wrzesień",
    "Październik",
    "Listopad",
    "Grudzień",
];

// Aliasy dla kompatybilności wstecznej (używają stałych z constants/days.ts)
// DAY_NAMES - skrócone nazwy zaczynające od poniedziałku (Pon, Wt, Śr...)
export const DAY_NAMES = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"];
// DAY_NAMES_JS - dla Date.getDay() gdzie 0=niedziela
export const DAY_NAMES_JS = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"];

/**
 * Formatuje datę po polsku
 */
export function formatDatePL(
    date: Date | string,
    formatStr: string = "dd MMMM yyyy",
): string {
    const d = typeof date === "string" ? parseISO(date) : date;
    return format(d, formatStr, { locale: pl });
}

/**
 * Formatuje nazwę po polsku (z dużej litery na początku, reszta małymi)
 */
export function formatName(name?: string, locale: string = "pl-PL"): string {
    if (!name) return "";

    return (
        name.charAt(0).toLocaleUpperCase(locale) +
        name.slice(1).toLocaleLowerCase(locale)
    );
}

/**
 * Zwraca nazwę miesiąca po polsku
 */
export function getMonthName(month: number): string {
    return MONTH_NAMES[month - 1] || "";
}

/**
 * Zwraca dni tygodnia dla danej daty
 */
export function getWeekDays(date: Date): Date[] {
    const start = startOfWeek(date, { weekStartsOn: 1 }); // Tydzień zaczyna się w poniedziałek
    const end = endOfWeek(date, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
}

/**
 * Przechodzi do następnego miesiąca
 */
export function nextMonth(date: Date): Date {
    return addMonths(date, 1);
}

/**
 * Przechodzi do poprzedniego miesiąca
 */
export function prevMonth(date: Date): Date {
    return subMonths(date, 1);
}

/**
 * Generuje listę lat (obecny ± 2)
 */
export function getYearOptions(): number[] {
    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
}

/**
 * Generuje listę miesięcy
 */
export function getMonthOptions(): { value: number; label: string }[] {
    return MONTH_NAMES.map((name, index) => ({
        value: index + 1,
        label: name,
    }));
}

/**
 * Formatuje czas HH:MM
 */
export function formatTime(time: string): string {
    return time.substring(0, 5);
}

/**
 * Parsuje string czasu "HH:MM" do obiektu
 * @example
 * parseTime("08:30") // { hours: 8, minutes: 30 }
 */
export function parseTime(time: string): { hours: number; minutes: number } {
    const [hours, minutes] = time.split(":").map(Number);
    return { hours, minutes };
}

/**
 * Parsuje string czasu do minut
 */
export function timeToMinutes(time: string): number {
    const { hours, minutes } = parseTime(time);
    return hours * 60 + minutes;
}

/**
 * Konwertuje minuty na string czasu
 */
export function minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/**
 * Oblicza czas pracy (godziny i minuty) na podstawie czasu rozpoczęcia, zakończenia i przerwy
 * @param start - Czas rozpoczęcia w formacie HH:MM
 * @param end - Czas zakończenia w formacie HH:MM
 * @param breakMins - Długość przerwy w minutach
 * @returns String w formacie "Xh" lub "Xh Ymin"
 */
export function calculateWorkHours(
    start: string,
    end: string,
    breakMins: number = 0,
): string {
    const startTime = parseTime(start);
    const endTime = parseTime(end);

    let totalMinutes =
        endTime.hours * 60 +
        endTime.minutes -
        (startTime.hours * 60 + startTime.minutes);
    if (totalMinutes < 0) totalMinutes += 24 * 60; // Zmiana przez północ
    totalMinutes -= breakMins;

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;

    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

/**
 * Formatuje Date na string w formacie YYYY-MM-DD (ISO 8601)
 * Używa date-fns format() dla spójności
 */
export function formatDateToISO(date: Date): string {
    return format(date, "yyyy-MM-dd");
}

/**
 * Oblicza miesiące w kwartale przed podanym miesiącem
 * Np. dla kwietnia (4) zwraca [1, 2, 3] (Q1 + kwiecień)
 * Dla maja (5) zwraca [4] (tylko poprzedni miesiąc w Q2)
 */
export function getPreviousMonthsInQuarter(
    month: number,
): { year: number; month: number }[] {
    // Kwartały: Q1 = 1-3, Q2 = 4-6, Q3 = 7-9, Q4 = 10-12
    const quarterStart = Math.floor((month - 1) / 3) * 3 + 1;
    const previousMonths: { year: number; month: number }[] = [];

    for (let m = quarterStart; m < month; m++) {
        previousMonths.push({ year: 0, month: m }); // year będzie ustawiony później
    }

    return previousMonths;
}
