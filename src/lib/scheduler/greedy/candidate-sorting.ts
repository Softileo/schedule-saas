/**
 * Wspólne funkcje sortowania kandydatów dla schedulera
 */

import type { EmployeeScheduleState } from "../types";
import type { ShiftTemplate } from "@/types";
import { getTemplateHours, getShiftTimeType } from "../scheduler-utils";

/**
 * Sortuje kandydatów według priorytetów:
 * 1. Minimalizacja nadgodzin
 * 2. Balansowanie weekendów (jeśli weekend)
 * 3. Balansowanie typów zmian
 * 4. Wyrównywanie % wykonania planu
 * 5. Liczba zmian
 */
export function sortCandidatesByPriority(
    candidates: EmployeeScheduleState[],
    template: ShiftTemplate,
    isWeekend: boolean,
): EmployeeScheduleState[] {
    const templateHours = getTemplateHours(template);

    return candidates.sort((a, b) => {
        const overtimeA = Math.max(
            0,
            a.currentHours + templateHours - a.requiredHours,
        );
        const overtimeB = Math.max(
            0,
            b.currentHours + templateHours - b.requiredHours,
        );

        // 1. Priorytet: Unikanie nadgodzin
        if (Math.abs(overtimeA - overtimeB) > 0.01) {
            return overtimeA - overtimeB;
        }

        // 2. Balansowanie weekendów (jeśli to weekend)
        if (isWeekend) {
            if (a.weekendShiftCount !== b.weekendShiftCount) {
                return a.weekendShiftCount - b.weekendShiftCount;
            }
        }

        // 3. Balansowanie typów zmian (Rano/Popołudnie/Wieczór)
        const shiftType = getShiftTimeType(template.start_time, template.name);
        let typeCountA = 0;
        let typeCountB = 0;

        if (shiftType === "morning") {
            typeCountA = a.morningShiftCount;
            typeCountB = b.morningShiftCount;
        } else if (shiftType === "afternoon") {
            typeCountA = a.afternoonShiftCount;
            typeCountB = b.afternoonShiftCount;
        } else {
            typeCountA = a.eveningShiftCount;
            typeCountB = b.eveningShiftCount;
        }

        if (typeCountA !== typeCountB) {
            return typeCountA - typeCountB;
        }

        // 4. Wyrównywanie % wykonania planu (kto ma większy deficyt procentowy)
        const saturationA =
            a.requiredHours > 0 ? a.currentHours / a.requiredHours : 1;
        const saturationB =
            b.requiredHours > 0 ? b.currentHours / b.requiredHours : 1;

        if (Math.abs(saturationA - saturationB) > 0.01) {
            return saturationA - saturationB;
        }

        // 5. Ostateczny tie-breaker: liczba zmian
        return a.shifts.length - b.shifts.length;
    });
}

/**
 * Filtruje kandydatów według podstawowych kryteriów
 */
export function getBasicCandidates(
    employeeStates: Map<string, EmployeeScheduleState>,
    day: string,
    template: ShiftTemplate,
    isWeekend: boolean,
    dailyTemplateStaffing: Map<string, Map<string, string[]>>,
    holidays: Array<any>,
    checkDailyRest: (
        state: EmployeeScheduleState,
        day: string,
        template: ShiftTemplate,
    ) => boolean,
    checkConsecutiveDays: (
        state: EmployeeScheduleState,
        day: string,
    ) => boolean,
    canEmployeeWorkOnDate: (
        emp: any,
        day: string,
        holidays: Array<any>,
    ) => boolean,
): EmployeeScheduleState[] {
    return Array.from(employeeStates.values()).filter((state) => {
        if (state.occupiedDates.has(day)) return false;
        if (!state.availableTemplates.some((t) => t.id === template.id))
            return false;

        if (!canEmployeeWorkOnDate(state.emp, day, holidays)) return false;

        if (isWeekend && state.emp.preferences?.can_work_weekends === false)
            return false;

        // Check max_employees limit
        if (
            template.max_employees !== null &&
            template.max_employees !== undefined
        ) {
            const dayTemplateMap = dailyTemplateStaffing.get(day);
            if (dayTemplateMap) {
                const templateStaff = dayTemplateMap.get(template.id);
                if (
                    templateStaff &&
                    templateStaff.length >= template.max_employees
                ) {
                    return false;
                }
            }
        }

        const hours = getTemplateHours(template);
        if (state.currentHours + hours > state.requiredHours) return false;

        // HARD CAP: Max 200h
        if (state.currentHours + hours > 200) return false;

        if (!checkDailyRest(state, day, template)) return false;

        if (!checkConsecutiveDays(state, day)) return false;

        return true;
    });
}
