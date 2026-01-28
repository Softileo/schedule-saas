"use client";

import { useMemo } from "react";
import { isSunday, isSaturday } from "date-fns";
import { isTradingSunday, formatDateToISO } from "@/lib/core/schedule/utils";
import type { OrganizationSettings, PublicHoliday } from "@/types";

export interface DayStatus {
    /** Czy to niedziela */
    isSunday: boolean;
    /** Czy to sobota */
    isSaturday: boolean;
    /** Czy to niedziela handlowa */
    isTradingSunday: boolean;
    /** Info o święcie (null jeśli nie święto) */
    holiday: PublicHoliday | null;
    /** Czy dzień jest zamknięty (niedziela niehandlowa lub święto) */
    isClosed: boolean;
    /** Czy to weekend (sobota lub niedziela) */
    isWeekend: boolean;
    /** Data w formacie YYYY-MM-DD */
    dateStr: string;
}

/**
 * Hook do określania statusu dnia (święto, niedziela handlowa, zamknięte itp.)
 *
 * @example
 * const { isClosed, holiday, isTradingSunday } = useDayStatus(day, settings, holidaysMap);
 *
 * if (isClosed) {
 *   return <ClosedDayCell />;
 * }
 */
export function useDayStatus(
    day: Date,
    organizationSettings: OrganizationSettings | null,
    holidaysMap: Map<string, PublicHoliday>
): DayStatus {
    return useMemo(() => {
        const dateStr = formatDateToISO(day);
        const isSundayDay = isSunday(day);
        const isSaturdayDay = isSaturday(day);
        const isTradingSun = isTradingSunday(day, organizationSettings);
        const holiday = holidaysMap.get(dateStr) ?? null;

        // Dzień jest zamknięty gdy:
        // 1. Jest świętem, LUB
        // 2. Jest niedzielą ale nie handlową
        const isClosed = !!holiday || (isSundayDay && !isTradingSun);

        return {
            isSunday: isSundayDay,
            isSaturday: isSaturdayDay,
            isTradingSunday: isTradingSun,
            holiday,
            isClosed,
            isWeekend: isSundayDay || isSaturdayDay,
            dateStr,
        };
    }, [day, organizationSettings, holidaysMap]);
}
