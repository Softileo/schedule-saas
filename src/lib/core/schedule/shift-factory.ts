/**
 * Factory functions dla tworzenia obiektów LocalShift
 */

import type { LocalShift, ShiftTemplate } from "@/types";

/**
 * Generuje unikalne tymczasowe ID dla nowej zmiany
 */
export function generateTempShiftId(): string {
    return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

interface CreateLocalShiftParams {
    scheduleId: string;
    employeeId: string;
    date: string;
    template: ShiftTemplate;
}

/**
 * Tworzy nową LocalShift z szablonu
 *
 * @example
 * const newShift = createLocalShiftFromTemplate({
 *   scheduleId,
 *   employeeId: employee.id,
 *   date: "2024-01-15",
 *   template: shiftTemplate,
 * });
 */
export function createLocalShiftFromTemplate({
    scheduleId,
    employeeId,
    date,
    template,
}: CreateLocalShiftParams): LocalShift {
    return {
        id: generateTempShiftId(),
        schedule_id: scheduleId,
        employee_id: employeeId,
        date,
        start_time: template.start_time,
        end_time: template.end_time,
        break_minutes: template.break_minutes,
        notes: null,
        color: template.color,
        status: "new",
    };
}

interface CreateCustomLocalShiftParams {
    scheduleId: string;
    employeeId: string;
    date: string;
    startTime: string;
    endTime: string;
    breakMinutes?: number;
    color?: string | null;
    notes?: string | null;
}

/**
 * Tworzy nową LocalShift z custom czasami
 *
 * @example
 * const newShift = createCustomLocalShift({
 *   scheduleId,
 *   employeeId: employee.id,
 *   date: "2024-01-15",
 *   startTime: "08:00",
 *   endTime: "16:00",
 *   breakMinutes: 30,
 * });
 */
export function createCustomLocalShift({
    scheduleId,
    employeeId,
    date,
    startTime,
    endTime,
    breakMinutes = 0,
    color = null,
    notes = null,
}: CreateCustomLocalShiftParams): LocalShift {
    return {
        id: generateTempShiftId(),
        schedule_id: scheduleId,
        employee_id: employeeId,
        date,
        start_time: startTime.includes(":") ? `${startTime}:00` : startTime,
        end_time: endTime.includes(":") ? `${endTime}:00` : endTime,
        break_minutes: breakMinutes,
        notes,
        color,
        status: "new",
    };
}

/**
 * Duplikuje istniejącą zmianę na nowy dzień
 */
export function duplicateShiftToDate(
    shift: LocalShift,
    newDate: string
): LocalShift {
    return {
        ...shift,
        id: generateTempShiftId(),
        date: newDate,
        status: "new",
    };
}

/**
 * Oznacza zmianę jako zmodyfikowaną (dla optymistycznych aktualizacji)
 */
export function markShiftAsModified(shift: LocalShift): LocalShift {
    return {
        ...shift,
        status: shift.status === "new" ? "new" : "modified",
    };
}

/**
 * Oznacza zmianę jako usuniętą
 */
export function markShiftAsDeleted(shift: LocalShift): LocalShift {
    return {
        ...shift,
        status: "deleted",
    };
}
