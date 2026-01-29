import type { Shift } from "@/types";

// Type guard dla obiektów zmian - może być Shift lub LocalShift
type ShiftLike = Pick<
    Shift,
    "date" | "end_time" | "employee_id" | "start_time"
>;

/**
 * Sortuje zmiany pracownika według daty i godziny zakończenia
 */
export function sortEmployeeShifts<T extends ShiftLike>(shifts: T[]): T[] {
    return shifts.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.end_time.localeCompare(b.end_time);
    });
}

/**
 * Pobiera i sortuje zmiany dla konkretnego pracownika
 */
export function getEmployeeShiftsSorted<T extends ShiftLike>(
    employeeId: string,
    allShifts: T[],
): T[] {
    const employeeShifts = allShifts.filter(
        (s) => s.employee_id === employeeId,
    );
    return sortEmployeeShifts(employeeShifts);
}

/**
 * Filtruje aktywne zmiany (status !== 'deleted')
 */
export function filterActiveShifts<T extends ShiftLike & { status?: string }>(
    shifts: T[],
): T[] {
    return shifts.filter((s) => s.status !== "deleted");
}
