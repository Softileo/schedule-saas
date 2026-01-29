import type { LocalShift } from "@/types";

/**
 * Wspólna funkcja do mapowania pól zmiany (bez id)
 */
export function mapShiftFieldsWithoutId(shift: LocalShift) {
    return {
        schedule_id: shift.schedule_id,
        employee_id: shift.employee_id,
        date: shift.date,
        start_time: shift.start_time,
        end_time: shift.end_time,
        break_minutes: shift.break_minutes,
        notes: shift.notes,
        color: shift.color,
    };
}

/**
 * Mapuje pola zmiany wraz z id
 */
export function mapShiftFieldsWithId(shift: LocalShift) {
    return {
        id: shift.id,
        ...mapShiftFieldsWithoutId(shift),
    };
}

/**
 * Konwertuje zmianę z bazy do LocalShift
 */
export function toLocalShift(dbShift: any): LocalShift {
    return {
        id: dbShift.id,
        schedule_id: dbShift.schedule_id,
        employee_id: dbShift.employee_id,
        date: dbShift.date,
        start_time: dbShift.start_time,
        end_time: dbShift.end_time,
        break_minutes: dbShift.break_minutes,
        notes: dbShift.notes,
        color: dbShift.color,
        status: "unchanged" as const,
    };
}
