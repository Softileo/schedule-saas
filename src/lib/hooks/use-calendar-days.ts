"use client";

import { useMemo } from "react";
import { startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";

/**
 * Hook do generowania tablicy dni w danym miesiącu
 *
 * @example
 * const days = useCalendarDays(2026, 1); // Styczeń 2026
 * // days = [Date, Date, Date, ...] (31 dat)
 */
export function useCalendarDays(year: number, month: number): Date[] {
    return useMemo(() => {
        const start = startOfMonth(new Date(year, month - 1));
        const end = endOfMonth(new Date(year, month - 1));
        return eachDayOfInterval({ start, end });
    }, [year, month]);
}
