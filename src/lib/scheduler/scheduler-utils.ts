/**
 * =============================================================================
 * SCHEDULER UTILS - Funkcje pomocnicze dla schedulera
 * =============================================================================
 */

import type { ShiftTemplate, OpeningHours, PublicHoliday } from "@/types";
import type { EmployeeWithData, GeneratedShift, ShiftTimeType } from "./types";
import { DAY_KEYS } from "@/lib/constants/days";
import { getRequiredHours } from "@/lib/core/schedule/work-hours";
import { getEmploymentTypeHoursPerDay } from "@/lib/constants/employment";
import { countAbsenceDaysInMonth } from "./absence-utils";
import {
    timeToMinutes,
    parseTime,
    formatDateToISO,
} from "@/lib/utils/date-helpers";

// =============================================================================
// FUNKCJE POMOCNICZE (PRZENIESIONE Z TYPES.TS)
// =============================================================================

/**
 * Oblicza efektywne godziny pracy dla szablonu (netto, bez przerwy)
 * Obsługuje zmiany nocne (end_time < start_time)
 */
export function getTemplateHours(template: ShiftTemplate): number {
    const startMinutes = timeToMinutes(template.start_time);
    const endMinutes = timeToMinutes(template.end_time);
    let totalMinutes = endMinutes - startMinutes;

    // Zmiana nocna - dodaj 24h
    if (totalMinutes < 0) {
        totalMinutes += 24 * 60;
    }

    return (totalMinutes - (template.break_minutes ?? 0)) / 60;
}

/**
 * Oblicza efektywne godziny dla pojedynczej zmiany
 * Obsługuje zmiany nocne (end_time < start_time)
 */
export function getShiftHours(shift: GeneratedShift): number {
    const startMinutes = timeToMinutes(shift.start_time);
    const endMinutes = timeToMinutes(shift.end_time);
    let totalMinutes = endMinutes - startMinutes;

    // Zmiana nocna - dodaj 24h
    if (totalMinutes < 0) {
        totalMinutes += 24 * 60;
    }

    return (totalMinutes - shift.break_minutes) / 60;
}

/**
 * Określa typ zmiany (rano/popołudnie/wieczór)
 * Logika ujednolicona z API
 */
export function getShiftTimeType(
    startTime: string,
    templateName?: string,
): ShiftTimeType {
    if (templateName) {
        const nameLower = templateName.toLowerCase();
        if (nameLower.includes("rano") || nameLower.includes("morning"))
            return "morning";
        if (
            nameLower.includes("wieczor") ||
            nameLower.includes("wieczór") ||
            nameLower.includes("evening") ||
            nameLower.includes("noc") ||
            nameLower.includes("night")
        )
            return "evening";
        if (
            nameLower.includes("popołudnie") ||
            nameLower.includes("popoludnie") ||
            nameLower.includes("afternoon")
        )
            return "afternoon";
    }

    const { hours } = parseTime(startTime);

    // Zmiany nocne (późne godziny lub bardzo wczesne rano) -> "evening" (jako 3. zmiana)
    // 00:00 - 04:59 -> Evening (3 zmiana)
    // 19:00 - 23:59 -> Evening (3 zmiana, choć start 19 to może być późne popołudnie)
    // Ale w kontekście 3-zmianowym: Rano (6-14), Popołudnie (14-22), Noc (22-6)

    // Przyjmijmy logikę dopasowaną do danych użytkownika:
    // 00:15 -> Evening (Noc)
    // 04:00 -> Morning (Wczesne rano) ? Lub Evening?
    // User: "04:00-12:00". To jest 8h.
    // Jeśli user wyróżnia "rano" i "2 zmianę" i "3 zmianę".
    // "00:15" to na pewno 3 zmiana.
    // "15:30" to na pewno 2 zmiana (Afternoon).
    // "05:00", "08:00" to Rano.

    // Ustawmy granice:
    // Morning: 04:00 - 11:59
    // Afternoon: 12:00 - 18:59
    // Evening: 19:00 - 03:59 (wszystko inne)

    if (hours >= 4 && hours < 12) return "morning";
    if (hours >= 12 && hours < 19) return "afternoon";
    return "evening";
}

/**
 * Parsuje datę YYYY-MM-DD na obiekt Date
 */
export function parseDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
}

/**
 * Oblicza różnicę dni między datami
 */
export function daysDiff(date1: string, date2: string): number {
    const d1 = parseDate(date1);
    const d2 = parseDate(date2);
    return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Zwraca dzień tygodnia (0 = niedziela, 6 = sobota)
 */
export function getDayOfWeek(dateStr: string): number {
    return parseDate(dateStr).getDay();
}

/**
 * Oblicza godziny odpoczynku między zmianami
 */
export function calculateRestHours(
    lastDate: string,
    lastEndTime: string,
    newDate: string,
    newStartTime: string,
): number {
    const lastEnd = parseTime(lastEndTime);
    const newStart = parseTime(newStartTime);

    const diff = daysDiff(lastDate, newDate);

    if (diff === 0) return 0;
    if (diff === 1) {
        const hoursToMidnight = 24 - (lastEnd.hours + lastEnd.minutes / 60);
        const hoursFromMidnight = newStart.hours + newStart.minutes / 60;
        return hoursToMidnight + hoursFromMidnight;
    }
    return (
        24 * diff -
        (lastEnd.hours + lastEnd.minutes / 60) +
        (newStart.hours + newStart.minutes / 60)
    );
}

/**
 * Pobiera początek tygodnia (poniedziałek) dla daty
 */
export function getWeekStart(dateStr: string): string {
    const date = parseDate(dateStr);
    const dayOfWeek = date.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(date);
    monday.setDate(date.getDate() - daysToSubtract);
    return formatDateToISO(monday);
}

/**
 * Pobiera szablony dostępne dla pracownika
 */
export function getAvailableTemplatesForEmployee(
    emp: EmployeeWithData,
    templates: ShiftTemplate[],
    templateAssignmentsMap: Map<string, string[]>,
): ShiftTemplate[] {
    // Sprawdź czy pracownik ma przypisane szablony
    const assignedTemplates = templates.filter((t) => {
        const assigned = templateAssignmentsMap.get(t.id) || [];
        return assigned.includes(emp.id);
    });

    if (assignedTemplates.length > 0) {
        return assignedTemplates;
    }

    // Zwróć szablony bez przypisań (uniwersalne)
    return templates.filter((t) => {
        const assigned = templateAssignmentsMap.get(t.id) || [];
        return assigned.length === 0;
    });
}

/**
 * Pobiera szablony pasujące do danego dnia
 * Uwzględnia:
 * - applicable_days szablonu (jeśli ustawione)
 * - godziny otwarcia organizacji
 */
export function getTemplatesForDay(
    templates: ShiftTemplate[],
    date: string,
    openingHours: OpeningHours | null,
    isTradingSunday: boolean,
): ShiftTemplate[] {
    const dayOfWeek = getDayOfWeek(date);
    const dayKey = DAY_KEYS[dayOfWeek]; // "sunday", "monday", etc.

    // Najpierw filtruj po applicable_days szablonu
    const filteredTemplates = templates.filter((t) => {
        // Jeśli applicable_days jest null lub puste - szablon dostępny każdego dnia
        if (!t.applicable_days || t.applicable_days.length === 0) {
            return true;
        }
        // Sprawdź czy dzień tygodnia (jako string enum) jest w liście dozwolonych dni
        return t.applicable_days.includes(dayKey as never);
    });

    // Jeśli brak godzin otwarcia - zwróć przefiltrowane szablony
    if (!openingHours) return filteredTemplates;

    const dayHours = openingHours[dayKey];

    // Niedziela handlowa - akceptuj wszystkie przefiltrowane szablony
    if (isTradingSunday && dayKey === "sunday") return filteredTemplates;

    // Dzień wyłączony
    if (!dayHours || !dayHours.enabled) return [];

    // Filtruj szablony pasujące do godzin otwarcia
    return filteredTemplates.filter((t) => {
        if (!dayHours.open || !dayHours.close) return true;

        const tStart = timeToMinutes(t.start_time);
        const tEnd = timeToMinutes(t.end_time);
        const open = timeToMinutes(dayHours.open);
        const close = timeToMinutes(dayHours.close);

        const tolerance = 30; // 30 minut tolerancji
        return tStart >= open - tolerance && tEnd <= close + tolerance;
    });
}

/**
 * Sortuje dni wg priorytetu (soboty > niedziele handlowe > dni robocze)
 */
export function sortDaysByPriority(
    days: string[],
    saturdaysSet: Set<string>,
    tradingSundaysSet: Set<string>,
): string[] {
    return [...days].sort((a, b) => {
        const aIsSat = saturdaysSet.has(a);
        const bIsSat = saturdaysSet.has(b);
        const aIsSun = tradingSundaysSet.has(a);
        const bIsSun = tradingSundaysSet.has(b);

        // Priorytet: soboty > niedziele handlowe > dni robocze
        if (aIsSat && !bIsSat) return -1;
        if (!aIsSat && bIsSat) return 1;
        if (aIsSun && !bIsSun) return -1;
        if (!aIsSun && bIsSun) return 1;

        return a.localeCompare(b);
    });
}

/**
 * Oblicza całkowitą liczbę wymaganych godzin dla wszystkich pracowników
 */
export function calculateTotalRequiredHours(
    employeeStates: Map<string, { requiredHours: number }>,
): number {
    let total = 0;
    employeeStates.forEach((state) => {
        total += state.requiredHours;
    });
    return total;
}

/**
 * Oblicza średnią długość zmiany
 */
export function calculateAverageTemplateHours(
    templates: ShiftTemplate[],
): number {
    if (templates.length === 0) return 8;

    let total = 0;
    templates.forEach((t) => {
        const startMinutes = timeToMinutes(t.start_time);
        const endMinutes = timeToMinutes(t.end_time);
        const hours =
            (endMinutes - startMinutes) / 60 - (t.break_minutes ?? 0) / 60;
        total += hours;
    });

    return total / templates.length;
}

/**
 * Oblicza wymagane godziny pracownika z pomniejszeniem o nieobecności
 *
 * WAŻNE: Ta funkcja jest używana przez ILP optimizer i evaluator,
 * aby poprawnie uwzględniać urlopy/nieobecności przy obliczaniu
 * czy pracownik ma nadmiar/niedobór godzin.
 */
export function getAdjustedRequiredHours(
    emp: EmployeeWithData,
    year: number,
    month: number,
    holidays: PublicHoliday[],
    tradingSundays: string[],
    settings: { opening_hours?: Record<string, { enabled?: boolean }> | null },
): number {
    // Podstawowe godziny wg typu zatrudnienia
    let requiredHours = getRequiredHours(
        year,
        month,
        holidays,
        emp.employment_type ?? "full",
        emp.custom_hours ?? undefined,
    );

    // Jeśli brak nieobecności - zwróć podstawowe godziny
    if (!emp.absences || emp.absences.length === 0) {
        return requiredHours;
    }

    // Oblicz zakres dat dla bieżącego miesiąca
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(
        lastDay,
    ).padStart(2, "0")}`;

    // Zbiór świąt
    const holidayDates = new Set(holidays.map((h) => h.date));
    const tradingSundaysSet = new Set(tradingSundays);

    // Godziny dzienne pracownika
    const hoursPerDay = getEmploymentTypeHoursPerDay(
        emp.employment_type ?? "full",
        emp.custom_hours ?? undefined,
    );

    // Odfiltruj tylko płatne nieobecności
    const paidAbsences = emp.absences.filter(
        (absence) => absence.is_paid === true,
    );

    // Policz dni nieobecności w tym miesiącu (pomijając święta i niedziele niehandlowe)
    const absenceDays = countAbsenceDaysInMonth({
        absences: paidAbsences,
        monthStart,
        monthEnd,
        holidayDates,
        tradingSundaysSet,
        settings,
    });

    // Pomniejsz wymagane godziny o dni nieobecności
    if (absenceDays > 0) {
        const reduction = absenceDays * hoursPerDay;
        requiredHours = Math.max(0, requiredHours - reduction);
    }

    return requiredHours;
}
