import { isSaturday, isSunday, format } from "date-fns";
import type { PublicHoliday, OrganizationSettings } from "@/types";
import type { SchedulePDFData } from "./pdf-types";
import { isTradingSunday } from "@/lib/core/schedule/utils";
import { DAY_NAMES_JS } from "@/lib/utils/date-helpers";

// Kolory dla tła dni - UJEDNOLICONE dla wszystkich szablonów PDF
export const DAY_COLORS = {
    holiday: "#fecaca", // czerwony - święta (red-200)
    weekend: "#f1f5f9", // szary - zamknięte/weekendy (slate-100)
    tradingSunday: "#dbeafe", // niebieski - niedziela handlowa (blue-100)
    normal: "#ffffff",
};

export function chunkEmployeesCustom(
    employees: SchedulePDFData["employees"],
    firstPageSize: number,
    otherPagesSize: number,
) {
    const pages = [];
    let start = 0;

    // Pierwsza strona
    if (employees.length > 0) {
        pages.push(employees.slice(0, firstPageSize));
        start = firstPageSize;
    }

    // Kolejne strony
    while (start < employees.length) {
        pages.push(employees.slice(start, start + otherPagesSize));
        start += otherPagesSize;
    }

    return pages;
}

/**
 * Pobiera kolor tła dla dnia
 */
export function getDayBackgroundColor(
    date: Date,
    holidaysMap: Map<string, PublicHoliday>,
    settings: OrganizationSettings | null,
): string {
    const dateStr = format(date, "yyyy-MM-dd");
    const holiday = holidaysMap.get(dateStr);

    if (holiday) {
        return DAY_COLORS.holiday;
    }

    if (isSunday(date)) {
        if (isTradingSunday(date, settings)) {
            return DAY_COLORS.tradingSunday;
        }
        return DAY_COLORS.weekend;
    }

    if (isSaturday(date)) {
        return DAY_COLORS.weekend;
    }

    return DAY_COLORS.normal;
}

/**
 * Pobiera nazwę dnia tygodnia po polsku
 */
export function getDayName(date: Date): string {
    return DAY_NAMES_JS[date.getDay()];
}

/**
 * Oblicza szerokość kolumny (równe kolumny dla każdego dnia)
 */
export function getColumnWidth(daysCount: number): number {
    // A4 landscape: 842pt szerokość, minus marginesy (2x30pt) = 782pt
    // Kolumna z pracownikiem: 80pt
    // Pozostaje: 702pt / daysCount
    const availableWidth = 702;
    return Math.floor(availableWidth / daysCount);
}

/**
 * Konwertuje kolor hex na jaśniejszą wersję dla tła
 */
export function lightenColor(hex: string, percent: number = 85): string {
    // Usuń # jeśli jest
    hex = hex.replace(/^#/, "");

    // Parsuj wartości RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Rozjaśnij
    const newR = Math.round(r + (255 - r) * (percent / 100));
    const newG = Math.round(g + (255 - g) * (percent / 100));
    const newB = Math.round(b + (255 - b) * (percent / 100));

    // Konwertuj z powrotem na hex
    return `#${newR.toString(16).padStart(2, "0")}${newG
        .toString(16)
        .padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`;
}

/**
 * Dzieli tablicę na mniejsze tablice o zadanym rozmiarze (paginacja)
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}
