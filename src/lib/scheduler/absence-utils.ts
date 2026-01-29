/**
 * =============================================================================
 * ABSENCE UTILITIES - Functions for calculating absence days
 * =============================================================================
 */

import type { Database } from "@/types/database";

type OrganizationSettings =
    Database["public"]["Tables"]["organization_settings"]["Row"];

interface AbsencePeriod {
    start_date: string;
    end_date: string;
}

interface AbsenceDaysParams {
    absences: AbsencePeriod[];
    monthStart: string;
    monthEnd: string;
    holidayDates: Set<string>;
    tradingSundaysSet: Set<string>;
    settings: {
        opening_hours?: Record<string, { enabled?: boolean }> | null;
    };
}

/**
 * Counts working days affected by absences within a month.
 * Excludes holidays, non-trading Sundays, and Saturdays if the store is closed.
 *
 * @param params - Parameters for calculating absence days
 * @returns Number of working days affected by absences
 */
export function countAbsenceDaysInMonth(params: AbsenceDaysParams): number {
    const {
        absences,
        monthStart,
        monthEnd,
        holidayDates,
        tradingSundaysSet,
        settings,
    } = params;
    let absenceDays = 0;

    for (const absence of absences) {
        // Check if absence overlaps with this month
        if (absence.start_date > monthEnd || absence.end_date < monthStart) {
            continue;
        }

        // Limit absence range to current month
        const absStart =
            absence.start_date < monthStart ? monthStart : absence.start_date;
        const absEnd =
            absence.end_date > monthEnd ? monthEnd : absence.end_date;

        // Count only working days (not holidays, not non-trading Sundays)
        const startDate = new Date(absStart);
        const endDate = new Date(absEnd);

        for (
            let d = new Date(startDate);
            d <= endDate;
            d.setDate(d.getDate() + 1)
        ) {
            const dateStr = `${d.getFullYear()}-${String(
                d.getMonth() + 1,
            ).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

            // Skip holidays
            if (holidayDates.has(dateStr)) continue;

            // Skip non-trading Sundays
            if (d.getDay() === 0 && !tradingSundaysSet.has(dateStr)) {
                continue;
            }

            // Skip Saturdays if store is closed
            const openingHours = settings.opening_hours as
                | Record<string, { enabled?: boolean }>
                | undefined;
            if (d.getDay() === 6 && openingHours?.saturday?.enabled === false) {
                continue;
            }

            absenceDays += 1;
        }
    }

    return absenceDays;
}
