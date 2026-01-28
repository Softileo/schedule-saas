import { checkEmployeeAbsence, canEmployeeUseTemplate } from "./utils";
import type { LocalShift } from "@/types";
import type {
    Employee,
    ShiftTemplate,
    EmployeeAbsence,
    ShiftTemplateAssignment,
} from "@/types";

export interface ValidationContext {
    employeeAbsences: EmployeeAbsence[];
    templateAssignments: ShiftTemplateAssignment[];
    activeShifts: LocalShift[];
    excludeShiftId?: string; // dla przenoszenia zmian
}

export type ValidationError =
    | { type: "absence" }
    | { type: "not_assigned"; startTime: string; endTime: string }
    | { type: "already_working" }
    | { type: "rest_violation" };

/**
 * Walidacja drop pracownika/zmiany na komórkę grafiku
 * @returns null jeśli OK, ValidationError jeśli błąd
 */
export function validateShiftDrop(
    employee: Employee,
    date: string,
    template: ShiftTemplate,
    context: ValidationContext,
    checkRestViolation?: (
        employeeId: string,
        date: string,
        startTime: string,
        endTime: string
    ) => boolean
): ValidationError | null {
    // 1. Check for absence
    const absence = checkEmployeeAbsence(
        employee.id,
        date,
        context.employeeAbsences
    );
    if (absence) {
        return { type: "absence" };
    }

    // 2. Check template assignment
    if (
        !canEmployeeUseTemplate(
            employee.id,
            template.id,
            context.templateAssignments
        )
    ) {
        return {
            type: "not_assigned",
            startTime: template.start_time,
            endTime: template.end_time,
        };
    }

    // 3. Check if already working this day
    const existingShift = context.activeShifts.find(
        (s) =>
            s.id !== context.excludeShiftId &&
            s.employee_id === employee.id &&
            s.date === date
    );
    if (existingShift) {
        return { type: "already_working" };
    }

    // 4. Check 11h rest violation (jeśli przekazano funkcję)
    if (checkRestViolation) {
        const hasViolation = checkRestViolation(
            employee.id,
            date,
            template.start_time,
            template.end_time
        );
        if (hasViolation) {
            return { type: "rest_violation" };
        }
    }

    return null;
}

/**
 * Sprawdza czy zmiana jest na tej samej komórce
 */
export function isSameCell(
    shift: LocalShift,
    date: string,
    template: ShiftTemplate
): boolean {
    return shift.date === date && shift.start_time === template.start_time;
}
