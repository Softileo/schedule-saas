import type { PublicHoliday, WorkingHoursResult } from "@/types";
import { MONTH_NAMES, timeToMinutes } from "@/lib/utils/date-helpers";
import { formatDateToISO } from "./utils";
import { fetchHolidays } from "@/lib/api/holidays";
import {
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isWeekend,
    isSaturday,
} from "date-fns";
import {
    type EmploymentType,
    getEmploymentTypeHoursPerDay,
    // Re-eksportujemy funkcje z constants dla wstecznej kompatybilności
    getEmploymentTypeLabel,
    getEmploymentTypeShortLabel,
} from "@/lib/constants/employment";

// Re-eksport dla wstecznej kompatybilności
export { getEmploymentTypeLabel, getEmploymentTypeShortLabel };

const DEFAULT_HOURS = 8;

/**
 * Oblicza liczbę dni roboczych i godzin pracy dla danego miesiąca
 */
export function calculateWorkingHours(
    year: number,
    month: number, // 1-12
    holidays: PublicHoliday[],
    hoursPerDay: number = DEFAULT_HOURS,
): WorkingHoursResult {
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));

    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    // Filtruj święta dla danego miesiąca
    const monthHolidays = holidays.filter((h) => {
        // Parse date string directly to avoid timezone issues
        const [hYear, hMonth] = h.date.split("-").map(Number);
        return hYear === year && hMonth === month;
    });

    const holidayDates = new Set(monthHolidays.map((h) => h.date));

    let workingDays = 0;
    let saturdays = 0;

    for (const day of allDays) {
        const dateStr = formatDateToISO(day);

        if (isSaturday(day)) {
            saturdays++;
        }

        if (!isWeekend(day) && !holidayDates.has(dateStr)) {
            workingDays++;
        }
    }

    return {
        totalWorkingDays: workingDays,
        totalWorkingHours: workingDays * hoursPerDay,
        holidays: monthHolidays,
        saturdays,
    };
}

/**
 * Oblicza wymagane godziny pracy dla danego typu etatu
 */
export function getRequiredHours(
    year: number,
    month: number,
    holidays: PublicHoliday[],
    employmentType: EmploymentType,
    customHours?: number,
): number {
    const hoursPerDay = getEmploymentTypeHoursPerDay(
        employmentType,
        customHours,
    );
    const result = calculateWorkingHours(year, month, holidays, hoursPerDay);
    return result.totalWorkingHours;
}

/**
 * Oblicza godziny pracy dla całego roku
 */
export async function calculateYearlyWorkingHours(
    year: number,
    employmentType: EmploymentType,
    customHours?: number,
): Promise<{
    monthly: {
        month: number;
        monthName: string;
        hours: number;
        workingDays: number;
    }[];
    total: number;
}> {
    const holidays = await fetchHolidays(year);

    const monthly = [];
    let total = 0;

    for (let month = 1; month <= 12; month++) {
        const hours = getRequiredHours(
            year,
            month,
            holidays,
            employmentType,
            customHours,
        );
        const result = calculateWorkingHours(year, month, holidays);

        monthly.push({
            month,
            monthName: MONTH_NAMES[month - 1],
            hours,
            workingDays: result.totalWorkingDays,
        });

        total += hours;
    }

    return { monthly, total };
}

/**
 * Oblicza przepracowane godziny z listy zmian
 * Obsługuje zmiany nocne przechodzące przez północ
 */
export function calculateWorkedHours(
    shifts: { start_time: string; end_time: string; break_minutes: number }[],
): number {
    return shifts.reduce((total, shift) => {
        let startMinutes = timeToMinutes(shift.start_time);
        let endMinutes = timeToMinutes(shift.end_time);

        // Obsługa 00:00 jako end_time = koniec dnia (24h)
        if (endMinutes === 0 && startMinutes >= 0) {
            endMinutes = 1440; // 24 * 60
        }

        // Obsługa zmian nocnych (przez północ) - np. 19:00-07:00
        let workedMinutes = endMinutes - startMinutes - shift.break_minutes;
        if (workedMinutes < 0) {
            workedMinutes += 24 * 60; // Dodaj 24h
        }

        return total + workedMinutes / 60;
    }, 0);
}

/**
 * Formatuje godziny do czytelnej postaci
 */
export function formatHours(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);

    if (m === 0) {
        return `${h}h`;
    }
    return `${h}h ${m}min`;
}

// getEmploymentTypeLabel i getEmploymentTypeShortLabel są re-exportowane z @/lib/constants/employment
