import { isSunday, isSaturday } from "date-fns";
import type {
    OrganizationSettings,
    OpeningHours,
    EmployeeAbsence,
    ShiftTemplateAssignment,
} from "@/types";
import { getTradingSundays } from "@/lib/api/holidays";
import { timeToMinutes, formatDateToISO } from "@/lib/utils/date-helpers";
export { formatDateToISO };

// Re-export for backward compatibility
// export { formatDateToISO } from "@/lib/utils/date-helpers";

/**
 * Zwraca domyślne polskie niedziele handlowe dla danego roku
 * Obliczane algorytmicznie wg polskiego prawa
 */
function getDefaultTradingSundays(year: number): string[] {
    return getTradingSundays(year);
}

/**
 * Sprawdza czy dzień jest niedzielą handlową
 * @param date - Data do sprawdzenia
 * @param settings - Ustawienia organizacji
 * @returns true jeśli to niedziela handlowa
 */
export function isTradingSunday(
    date: Date,
    settings: OrganizationSettings | null,
): boolean {
    if (!isSunday(date)) return false;
    if (!settings) return false;

    const dateStr = formatDateToISO(date);
    const year = date.getFullYear();

    // Najpierw sprawdź czy niedziela jest włączona w godzinach otwarcia
    // Jeśli tak, to jest handlowa (niezależnie od trading_sundays_mode)
    const openingHours = settings.opening_hours as OpeningHours | null;
    if (openingHours?.sunday?.enabled) {
        // Niedziela jest włączona w godzinach otwarcia - sprawdź tryb
        switch (settings.trading_sundays_mode) {
            case "all":
                return true;
            case "custom":
                // Jeśli custom ale lista pusta lub null, traktuj jak "all"
                if (
                    !settings.custom_trading_sundays ||
                    settings.custom_trading_sundays.length === 0
                ) {
                    return true;
                }
                return settings.custom_trading_sundays.includes(dateStr);
            case "none":
            default:
                // Tryb "none" ale niedziela włączona - traktuj jak handlową
                // (użytkownik włączył niedzielę w godzinach, więc chce żeby była obsadzana)
                return true;
        }
    }

    // Niedziela wyłączona w godzinach otwarcia - sprawdź trading_sundays_mode
    switch (settings.trading_sundays_mode) {
        case "all":
            return true;
        case "none":
            // Jeśli tryb "none" ale enable_trading_sundays jest true,
            // użyj domyślnych polskich niedziel handlowych
            if (settings.enable_trading_sundays) {
                const defaultSundays = getDefaultTradingSundays(year);
                return defaultSundays.includes(dateStr);
            }
            return false;
        case "custom":
            return settings.custom_trading_sundays?.includes(dateStr) || false;
        default:
            return false;
    }
}

/**
 * Sprawdza czy pracownik ma nieobecność w danym dniu
 * @param employeeId - ID pracownika
 * @param date - Data w formacie YYYY-MM-DD
 * @param absences - Lista nieobecności
 * @returns Obiekt nieobecności lub null
 */
export function checkEmployeeAbsence(
    employeeId: string,
    date: string,
    absences: EmployeeAbsence[],
): EmployeeAbsence | null {
    const found = absences.find((absence) => {
        if (absence.employee_id !== employeeId) return false;
        const isInRange =
            date >= absence.start_date && date <= absence.end_date;
        if (isInRange) {
            console.log("✓ Found absence:", {
                employeeId,
                date,
                absence,
            });
        }
        return isInRange;
    });
    return found || null;
}

/**
 * Sprawdza czy pracownik może używać danego szablonu zmiany
 * @param employeeId - Employee ID
 * @param templateId - Shift template ID
 * @param assignments - List of template assignments to employees
 * @returns true if employee can use the template
 */
export function canEmployeeUseTemplate(
    employeeId: string,
    templateId: string,
    assignments: ShiftTemplateAssignment[],
): boolean {
    // Check if employee has ANY template assignments
    const employeeAssignments = assignments.filter(
        (a) => a.employee_id === employeeId,
    );

    // If employee has NO assignments - can use all templates
    if (employeeAssignments.length === 0) {
        // But also check if template has other assigned employees
        const templateAssignments = assignments.filter(
            (a) => a.template_id === templateId,
        );
        // If template has assigned employees, and this employee is not among them - cannot use
        if (templateAssignments.length > 0) return false;
        // Template has no assignments, employee has no assignments - can use
        return true;
    }

    // Employee HAS assignments - can ONLY use templates they are assigned to
    return employeeAssignments.some((a) => a.template_id === templateId);
}

// Mapa numerów dni tygodnia na string enum
const DAY_INDEX_TO_ENUM = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
] as const;

/**
 * Sprawdza czy szablon jest dostępny w danym dniu tygodnia
 * @param template - Szablon zmiany
 * @param date - Data (opcjonalna, jeśli podana sprawdza dzień tygodnia)
 * @param dayOfWeek - Dzień tygodnia 0-6 (opcjonalny, alternatywa dla date)
 * @returns true jeśli szablon jest dostępny w ten dzień
 */
export function isTemplateAvailableOnDay(
    template: { applicable_days: string[] | number[] | null },
    dateOrDayOfWeek: Date | string | number,
): boolean {
    // Jeśli applicable_days jest null lub puste - dostępny każdego dnia
    if (!template.applicable_days || template.applicable_days.length === 0) {
        return true;
    }

    // Oblicz dzień tygodnia
    let dayOfWeek: number;
    if (typeof dateOrDayOfWeek === "number") {
        dayOfWeek = dateOrDayOfWeek;
    } else if (typeof dateOrDayOfWeek === "string") {
        dayOfWeek = new Date(dateOrDayOfWeek).getDay();
    } else {
        dayOfWeek = dateOrDayOfWeek.getDay();
    }

    // Konwertuj dayOfWeek na string enum (np. 6 -> "saturday")
    const dayEnum = DAY_INDEX_TO_ENUM[dayOfWeek];

    // Sprawdź czy applicable_days zawiera string enum lub numer (dla kompatybilności)
    return template.applicable_days.some(
        (day) => day === dayEnum || day === dayOfWeek,
    );
}

/**
 * Checks if a day is a non-working day
 * @param date - Date to check
 * @param isHoliday - Whether it's a holiday
 * @param settings - Organization settings
 * @returns true if day is non-working
 */
export function isNonWorkingDay(
    date: Date,
    isHoliday: boolean,
    settings: OrganizationSettings | null,
): boolean {
    if (isHoliday) return true;
    if (isSaturday(date)) return true; // Saturdays always as weekend
    if (isSunday(date) && !isTradingSunday(date, settings)) return true;
    return false;
}

/**
 * Checks if there are gaps in coverage of opening hours by employees
 * @param shifts - Shifts for the day (sorted)
 * @param openHour - Opening hour (HH:MM)
 * @param closeHour - Closing hour (HH:MM)
 * @returns true if there is at least 1 minute without coverage
 */
export function hasCoverageGap(
    shifts: { start_time: string; end_time: string }[],
    openHour: string,
    closeHour: string,
): boolean {
    if (shifts.length === 0) return true; // No shifts = no coverage

    const openMinutes = timeToMinutes(openHour);
    const closeMinutes = timeToMinutes(closeHour);

    // Create coverage array for each minute
    // Using simpler method: sort shifts and check continuity

    // Sort shifts by start time
    const sortedShifts = [...shifts].sort(
        (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time),
    );

    // Check if first shift starts at or before opening time
    const firstShiftStart = timeToMinutes(sortedShifts[0].start_time);
    if (firstShiftStart > openMinutes) return true;

    // Track the furthest coverage end time
    let coveredUntil = openMinutes;

    for (const shift of sortedShifts) {
        const shiftStart = timeToMinutes(shift.start_time);
        const shiftEnd = timeToMinutes(shift.end_time);

        // If shift starts after current coverage - there's a gap
        if (shiftStart > coveredUntil) return true;

        // Extend coverage if this shift ends later
        if (shiftEnd > coveredUntil) {
            coveredUntil = shiftEnd;
        }
    }

    // Check if coverage reaches closing time
    return coveredUntil < closeMinutes;
}

/**
 * Converts minutes from midnight to time HH:MM
 */
function minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins
        .toString()
        .padStart(2, "0")}`;
}

/**
 * Detailed information about coverage gap
 */
export interface CoverageGapInfo {
    hasGap: boolean;
    gaps: { from: string; to: string }[];
    message: string;
}

/**
 * Checks coverage gaps and returns detailed information
 * @param shifts - Shifts for the day
 * @param openHour - Opening hour (HH:MM)
 * @param closeHour - Closing hour (HH:MM)
 * @returns Object with gap information
 */
export function getCoverageGapDetails(
    shifts: { start_time: string; end_time: string }[],
    openHour: string,
    closeHour: string,
): CoverageGapInfo {
    const gaps: { from: string; to: string }[] = [];
    const openMinutes = timeToMinutes(openHour);
    const closeMinutes = timeToMinutes(closeHour);

    if (shifts.length === 0) {
        return {
            hasGap: true,
            gaps: [{ from: openHour, to: closeHour }],
            message: `Brak pracowników (${openHour.slice(
                0,
                5,
            )}-${closeHour.slice(0, 5)})`,
        };
    }

    // Sortuj zmiany według czasu rozpoczęcia
    const sortedShifts = [...shifts].sort(
        (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time),
    );

    let coveredUntil = openMinutes;

    // Sprawdź czy pierwsza zmiana zaczyna się po otwarciu
    const firstShiftStart = timeToMinutes(sortedShifts[0].start_time);
    if (firstShiftStart > openMinutes) {
        gaps.push({
            from: minutesToTime(openMinutes),
            to: minutesToTime(firstShiftStart),
        });
        coveredUntil = firstShiftStart;
    }

    for (const shift of sortedShifts) {
        const shiftStart = timeToMinutes(shift.start_time);
        const shiftEnd = timeToMinutes(shift.end_time);

        // Jeśli zmiana zaczyna się po aktualnym pokryciu - jest luka
        if (shiftStart > coveredUntil) {
            gaps.push({
                from: minutesToTime(coveredUntil),
                to: minutesToTime(shiftStart),
            });
        }

        // Rozszerz pokrycie
        if (shiftEnd > coveredUntil) {
            coveredUntil = shiftEnd;
        }
    }

    // Sprawdź czy pokrycie sięga do zamknięcia
    if (coveredUntil < closeMinutes) {
        gaps.push({
            from: minutesToTime(coveredUntil),
            to: minutesToTime(closeMinutes),
        });
    }

    if (gaps.length === 0) {
        return { hasGap: false, gaps: [], message: "" };
    }

    // Twórz czytelny komunikat
    const gapStrings = gaps.map(
        (g) => `${g.from.slice(0, 5)}-${g.to.slice(0, 5)}`,
    );
    const message =
        gaps.length === 1
            ? `Brak pracownika: ${gapStrings[0]}`
            : `Brak pracowników: ${gapStrings.join(", ")}`;

    return { hasGap: true, gaps, message };
}

/**
 * Tworzy mapę świąt z tablicy (klucz: data w formacie YYYY-MM-DD)
 * @param holidays - Tablica świąt
 * @returns Mapa świąt
 */
export function createHolidaysMap<T extends { date: string }>(
    holidays: T[],
): Map<string, T> {
    const map = new Map<string, T>();
    holidays.forEach((h) => map.set(h.date, h));
    return map;
}

/**
 * Grupuje zmiany po dacie - O(n) zamiast O(n*m)
 * @param shifts - Lista zmian do pogrupowania
 * @param sortByTime - Czy sortować zmiany w każdym dniu po czasie startu
 * @returns Mapa data -> lista zmian
 */
export function createShiftsByDateMap<
    T extends { date: string; start_time: string },
>(shifts: T[], sortByTime: boolean = false): Map<string, T[]> {
    const map = new Map<string, T[]>();
    for (const shift of shifts) {
        const existing = map.get(shift.date) || [];
        existing.push(shift);
        map.set(shift.date, existing);
    }
    if (sortByTime) {
        for (const [date, dateShifts] of map) {
            dateShifts.sort((a, b) => a.start_time.localeCompare(b.start_time));
            map.set(date, dateShifts);
        }
    }
    return map;
}

/**
 * Sortuje szablony zmian po godzinie startu
 * @param templates - Lista szablonów do posortowania
 * @returns Posortowana kopia listy
 */
export function sortShiftTemplatesByTime<T extends { start_time: string }>(
    templates: T[],
): T[] {
    return [...templates].sort((a, b) =>
        a.start_time.localeCompare(b.start_time),
    );
}
