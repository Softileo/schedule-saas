import { isSunday, eachDayOfInterval, parseISO, format } from "date-fns";
import {
    getRequiredHours,
    calculateWorkedHours,
} from "@/lib/core/schedule/work-hours";
import { getEmploymentTypeHoursPerDay } from "@/lib/constants/employment";
import { isTradingSunday } from "@/lib/core/schedule/utils";
import type {
    Employee,
    PublicHoliday,
    LocalShift,
    EmployeeAbsence,
    OrganizationSettings,
} from "@/types";

export type SchedulesHoursMap = Map<
    string,
    { scheduled: number; required: number }
>;

export type AbsenceInfoMap = Map<
    string,
    { type: string; days: number; paidHours: number } | null
>;

/**
 * Oblicza godziny zaplanowane vs wymagane dla listy pracowników.
 */
export function calculateEmployeesScheduledHours(
    employees: Employee[],
    activeShifts: LocalShift[],
    year: number,
    month: number,
    holidays: PublicHoliday[]
): SchedulesHoursMap {
    const map = new Map<string, { scheduled: number; required: number }>();

    employees.forEach((emp) => {
        // Bazowe wymagane godziny - PEŁNE, bez pomniejszania
        const required = getRequiredHours(
            year,
            month,
            holidays,
            emp.employment_type ?? "full",
            emp.custom_hours ?? undefined
        );

        const employeeShifts = activeShifts.filter(
            (s) => s.employee_id === emp.id
        );
        const scheduled = calculateWorkedHours(
            employeeShifts.map((s) => ({
                ...s,
                break_minutes: s.break_minutes ?? 0,
            }))
        );
        map.set(emp.id, { scheduled, required });
    });
    return map;
}

/**
 * Agreguje informacje o nieobecnościach dla pracowników w danym miesiącu.
 */
export function calculateEmployeesAbsenceInfo(
    employees: Employee[],
    employeeAbsences: EmployeeAbsence[],
    year: number,
    month: number,
    holidays: PublicHoliday[],
    organizationSettings?: OrganizationSettings | null
): AbsenceInfoMap {
    const map = new Map<
        string,
        { type: string; days: number; paidHours: number } | null
    >();

    // Oblicz zakres dat dla bieżącego miesiąca
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(
        lastDay
    ).padStart(2, "0")}`;

    // Zbiór dat świątecznych
    const holidayDates = new Set(holidays.map((h) => h.date));

    // Sprawdź czy soboty są zamknięte
    const openingHours = organizationSettings?.opening_hours as
        | Record<string, { enabled?: boolean }>
        | undefined;
    const isSaturdayClosed = openingHours?.saturday?.enabled === false;

    employees.forEach((emp) => {
        // Policz nieobecności w tym miesiącu
        const absencesInMonth = employeeAbsences.filter((a) => {
            if (a.employee_id !== emp.id) return false;
            return a.start_date <= monthEnd && a.end_date >= monthStart;
        });

        if (absencesInMonth.length === 0) {
            map.set(emp.id, null);
            return;
        }

        // Oblicz godziny dzienne pracownika
        const hoursPerDay = getEmploymentTypeHoursPerDay(
            emp.employment_type ?? "full",
            emp.custom_hours ?? undefined
        );

        // Zlicz dni robocze nieobecności i znajdź główny typ
        let paidDays = 0;
        const typeCount = new Map<string, number>();

        absencesInMonth.forEach((absence) => {
            const absStart =
                absence.start_date < monthStart
                    ? monthStart
                    : absence.start_date;
            const absEnd =
                absence.end_date > monthEnd ? monthEnd : absence.end_date;

            const startDate = parseISO(absStart);
            const endDate = parseISO(absEnd);
            const daysInRange = eachDayOfInterval({
                start: startDate,
                end: endDate,
            });

            let daysForThisAbsence = 0;
            daysInRange.forEach((day) => {
                const dateStr = format(day, "yyyy-MM-dd");

                // Pomiń święta
                if (holidayDates.has(dateStr)) return;

                // Pomiń niedziele niehandlowe
                if (
                    isSunday(day) &&
                    !isTradingSunday(day, organizationSettings ?? null)
                ) {
                    return;
                }

                // Pomiń soboty jeśli zamknięte
                if (isSaturdayClosed && day.getDay() === 6) {
                    return;
                }

                daysForThisAbsence += 1;
            });

            // Tylko płatne nieobecności liczą się do godzin i typu
            if (absence.is_paid !== false) {
                paidDays += daysForThisAbsence;
                typeCount.set(
                    absence.absence_type,
                    (typeCount.get(absence.absence_type) || 0) +
                        daysForThisAbsence
                );
            }
        });

        // Znajdź dominujący typ nieobecności
        let mainType = "other";
        let maxCount = 0;
        typeCount.forEach((count, type) => {
            if (count > maxCount) {
                maxCount = count;
                mainType = type;
            }
        });

        map.set(emp.id, {
            type: mainType,
            days: paidDays,
            paidHours: paidDays * hoursPerDay,
        });
    });

    return map;
}
