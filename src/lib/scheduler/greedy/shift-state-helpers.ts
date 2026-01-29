import { type EmployeeScheduleState, type GeneratedShift } from "../types";
import { getShiftTimeType, daysDiff } from "../scheduler-utils";
import type { ShiftTemplate } from "@/types";

/**
 * Wspólna logika aktualizacji liczników zmian pracownika
 */
export function updateShiftCounters(
    state: EmployeeScheduleState,
    date: string,
    timeType: "morning" | "afternoon" | "evening",
    weekendDaysSet: Set<string>,
    saturdaysSet: Set<string>,
    tradingSundaysSet: Set<string>,
    increment: boolean = true,
): void {
    const delta = increment ? 1 : -1;

    // Aktualizuj liczniki dni specjalnych
    if (weekendDaysSet.has(date)) state.weekendShiftCount += delta;
    if (saturdaysSet.has(date)) state.saturdayShiftCount += delta;
    if (tradingSundaysSet.has(date)) state.sundayShiftCount += delta;

    // Aktualizuj liczniki typów zmian
    if (timeType === "morning") state.morningShiftCount += delta;
    else if (timeType === "afternoon") state.afternoonShiftCount += delta;
    else state.eveningShiftCount += delta;
}

/**
 * Wspólna logika aktualizacji ciągłości zmian
 */
export function updateShiftContinuity(
    state: EmployeeScheduleState,
    date: string,
    timeType: "morning" | "afternoon" | "evening",
    template: ShiftTemplate | null,
): void {
    // Aktualizuj ciągłość tego samego typu zmiany
    if (template && state.lastShiftTemplate?.id === template.id) {
        state.consecutiveShiftDays++;
    } else {
        state.consecutiveShiftDays = 1;
        state.lastShiftType = timeType;
        state.lastShiftTemplate = template;
    }

    // Aktualizuj dni z rzędu
    if (state.lastShiftDate) {
        const diff = daysDiff(state.lastShiftDate, date);
        if (diff === 1) {
            state.consecutiveWorkDays++;
        } else if (diff > 1) {
            state.consecutiveWorkDays = 1;
        }
    } else {
        state.consecutiveWorkDays = 1;
    }
}

/**
 * Aktualizuje stan pracownika po dodaniu zmiany
 */
export function addShiftToState(
    state: EmployeeScheduleState,
    shift: GeneratedShift,
    hours: number,
    date: string,
    endTime: string,
    timeType: "morning" | "afternoon" | "evening",
    template: ShiftTemplate | null,
    weekendDaysSet: Set<string>,
    saturdaysSet: Set<string>,
    tradingSundaysSet: Set<string>,
): void {
    state.shifts.push(shift);
    state.currentHours += hours;
    state.occupiedDates.add(date);

    // Aktualizuj liczniki
    updateShiftCounters(
        state,
        date,
        timeType,
        weekendDaysSet,
        saturdaysSet,
        tradingSundaysSet,
        true,
    );

    // Aktualizuj ciągłość
    updateShiftContinuity(state, date, timeType, template);

    // Aktualizuj ostatnią zmianę
    state.lastShiftDate = date;
    state.lastShiftEndTime = endTime;
}

/**
 * Aktualizuje struktury obsady dziennej
 */
export function addShiftToStaffing(
    shift: GeneratedShift,
    dailyStaffing: Map<string, GeneratedShift[]>,
    dailyTemplateStaffing: Map<string, Map<string, GeneratedShift[]>>,
    date: string,
    templateId?: string,
): void {
    // Aktualizuj dailyStaffing
    dailyStaffing.get(date)?.push(shift);

    // Aktualizuj dailyTemplateStaffing (tylko dla zmian z szablonem)
    if (templateId) {
        const dayTemplateMap = dailyTemplateStaffing.get(date);
        if (dayTemplateMap) {
            let templateStaff = dayTemplateMap.get(templateId);
            if (!templateStaff) {
                templateStaff = [];
                dayTemplateMap.set(templateId, templateStaff);
            }
            templateStaff.push(shift);
        }
    }
}

/**
 * Usuwa zmianę ze struktury obsady dziennej
 */
export function removeShiftFromStaffing(
    shift: GeneratedShift,
    empId: string,
    dailyStaffing: Map<string, GeneratedShift[]>,
    dailyTemplateStaffing: Map<string, Map<string, GeneratedShift[]>>,
): void {
    // Usuń z dailyStaffing
    const dayStaff = dailyStaffing.get(shift.date);
    if (dayStaff) {
        const idx = dayStaff.findIndex(
            (s) =>
                s.employee_id === empId &&
                s.start_time === shift.start_time &&
                s.end_time === shift.end_time,
        );
        if (idx !== -1) dayStaff.splice(idx, 1);
    }

    // Usuń z dailyTemplateStaffing
    if (shift.template_id) {
        const dayTemplateMap = dailyTemplateStaffing.get(shift.date);
        if (dayTemplateMap) {
            const templateStaff = dayTemplateMap.get(shift.template_id);
            if (templateStaff) {
                const idx = templateStaff.findIndex(
                    (s) =>
                        s.employee_id === empId &&
                        s.start_time === shift.start_time &&
                        s.end_time === shift.end_time,
                );
                if (idx !== -1) templateStaff.splice(idx, 1);
            }
        }
    }
}

/**
 * Tworzy obiekt GeneratedShift z szablonu
 */
export function createShiftFromTemplate(
    empId: string,
    date: string,
    template: ShiftTemplate,
): GeneratedShift {
    return {
        employee_id: empId,
        date,
        start_time: template.start_time.substring(0, 5),
        end_time: template.end_time.substring(0, 5),
        break_minutes: template.break_minutes ?? 0,
        template_id: template.id,
    };
}

/**
 * Tworzy niestandardowy obiekt GeneratedShift
 */
export function createCustomShift(
    empId: string,
    date: string,
    startTime: string,
    endTime: string,
    breakMinutes: number,
): GeneratedShift {
    return {
        employee_id: empId,
        date,
        start_time: startTime,
        end_time: endTime,
        break_minutes: breakMinutes,
    };
}
