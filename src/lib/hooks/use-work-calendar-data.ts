/**
 * Hook do obliczania danych kalendarza pracy dla całego roku
 */

import { useState, useEffect } from "react";
import { getDaysInMonth, parseISO, isSaturday } from "date-fns";
import { fetchHolidays } from "@/lib/api/holidays";
import { calculateWorkingHours } from "@/lib/core/schedule/work-hours";
import { MONTH_NAMES } from "@/lib/utils/date-helpers";
import type { PublicHoliday } from "@/types";

export interface MonthData {
    month: number;
    name: string;
    workingDays: number;
    hours: number;
    holidays: PublicHoliday[];
    freeDays: number;
}

export interface WorkCalendarData {
    workData: MonthData[];
    holidays: PublicHoliday[];
    isLoading: boolean;
    totalWorkingDays: number;
    totalHours: number;
    totalHolidays: number;
    totalFreeDays: number;
}

/**
 * Hook do obliczania danych kalendarza pracy dla całego roku
 * @param year - Rok do obliczenia
 * @param hoursPerDay - Liczba godzin na dzień roboczy (domyślnie 8)
 */
export function useWorkCalendarData(
    year: number,
    hoursPerDay: number = 8,
): WorkCalendarData {
    const [workData, setWorkData] = useState<MonthData[]>([]);
    const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const yearHolidays = await fetchHolidays(year);
                setHolidays(yearHolidays);

                const monthsData: MonthData[] = [];

                for (let month = 1; month <= 12; month++) {
                    const result = calculateWorkingHours(
                        year,
                        month,
                        yearHolidays,
                        hoursPerDay,
                    );

                    // Sprawdź czy jakieś święto w tym miesiącu wypada w sobotę
                    const saturdayHolidaysCount = result.holidays.filter(
                        (holiday) => {
                            const holidayDate = parseISO(holiday.date);
                            return isSaturday(holidayDate);
                        },
                    ).length;

                    // Odejmij dni robocze za święta w soboty (dzień wolny rekompensujący)
                    const adjustedWorkingDays =
                        result.totalWorkingDays - saturdayHolidaysCount;
                    const adjustedHours = adjustedWorkingDays * hoursPerDay;

                    // Oblicz dni wolne (wszystkie dni miesiąca - dni robocze)
                    const daysInMonth = getDaysInMonth(
                        new Date(year, month - 1),
                    );
                    const freeDays = daysInMonth - adjustedWorkingDays;

                    monthsData.push({
                        month,
                        name: MONTH_NAMES[month - 1],
                        workingDays: adjustedWorkingDays,
                        hours: adjustedHours,
                        holidays: result.holidays,
                        freeDays,
                    });
                }

                setWorkData(monthsData);
            } catch (error) {
                console.error("Error loading work data:", error);
            } finally {
                setIsLoading(false);
            }
        }

        loadData();
    }, [year, hoursPerDay]);

    // Oblicz całkowite dane
    const totalWorkingDays = workData.reduce(
        (sum, m) => sum + m.workingDays,
        0,
    );
    const totalHours = workData.reduce((sum, m) => sum + m.hours, 0);
    const totalHolidays = workData.reduce(
        (sum, m) => sum + m.holidays.length,
        0,
    );
    const totalFreeDays = workData.reduce((sum, m) => sum + m.freeDays, 0);

    return {
        workData,
        holidays,
        isLoading,
        totalWorkingDays,
        totalHours,
        totalHolidays,
        totalFreeDays,
    };
}
