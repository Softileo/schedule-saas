import { type EmployeeScheduleState, type GeneratedShift } from "../types";
import {
    getTemplateHours,
    getShiftHours,
    getShiftTimeType,
} from "../scheduler-utils";
import type { ShiftTemplate } from "@/types";
import {
    addShiftToState,
    addShiftToStaffing,
    removeShiftFromStaffing,
    updateShiftCounters,
    createShiftFromTemplate,
    createCustomShift,
} from "./shift-state-helpers";

export class ShiftManager {
    constructor(
        private employeeStates: Map<string, EmployeeScheduleState>,
        private dailyStaffing: Map<string, GeneratedShift[]>,
        private dailyTemplateStaffing: Map<
            string,
            Map<string, GeneratedShift[]>
        >,
        private weekendDaysSet: Set<string>,
        private saturdaysSet: Set<string>,
        private tradingSundaysSet: Set<string>,
    ) {}

    addShift(
        empId: string,
        date: string,
        template: ShiftTemplate,
    ): GeneratedShift | null {
        const state = this.employeeStates.get(empId);
        if (!state) return null;

        const hours = getTemplateHours(template);
        const timeType = getShiftTimeType(template.start_time.substring(0, 5));
        const shift = createShiftFromTemplate(empId, date, template);

        // Aktualizuj stan pracownika
        addShiftToState(
            state,
            shift,
            hours,
            date,
            template.end_time.substring(0, 5),
            timeType,
            template,
            this.weekendDaysSet,
            this.saturdaysSet,
            this.tradingSundaysSet,
        );

        // Aktualizuj struktury obsady
        addShiftToStaffing(
            shift,
            this.dailyStaffing,
            this.dailyTemplateStaffing,
            date,
            template.id,
        );

        return shift;
    }

    removeShift(empId: string, shift: GeneratedShift): void {
        const state = this.employeeStates.get(empId);
        if (!state) return;

        const hours = getShiftHours(shift);
        const timeType = getShiftTimeType(shift.start_time);

        // Usuń z listy zmian
        const shiftIndex = state.shifts.findIndex(
            (s) =>
                s.date === shift.date &&
                s.start_time === shift.start_time &&
                s.end_time === shift.end_time,
        );
        if (shiftIndex !== -1) {
            state.shifts.splice(shiftIndex, 1);
        }

        // Aktualizuj liczniki
        state.currentHours -= hours;
        state.occupiedDates.delete(shift.date);

        updateShiftCounters(
            state,
            shift.date,
            timeType,
            this.weekendDaysSet,
            this.saturdaysSet,
            this.tradingSundaysSet,
            false,
        );

        // Usuń ze struktur obsady
        removeShiftFromStaffing(
            shift,
            empId,
            this.dailyStaffing,
            this.dailyTemplateStaffing,
        );
    }

    addCustomShift(
        empId: string,
        date: string,
        startTime: string,
        endTime: string,
        breakMinutes: number,
        hours: number,
    ): GeneratedShift | null {
        const state = this.employeeStates.get(empId);
        if (!state) return null;

        const timeType = getShiftTimeType(startTime);
        const shift = createCustomShift(
            empId,
            date,
            startTime,
            endTime,
            breakMinutes,
        );

        // Aktualizuj stan pracownika
        addShiftToState(
            state,
            shift,
            hours,
            date,
            endTime.substring(0, 5),
            timeType,
            null, // Custom shift nie ma szablonu
            this.weekendDaysSet,
            this.saturdaysSet,
            this.tradingSundaysSet,
        );

        // Aktualizuj struktury obsady (bez template_id dla custom shifts)
        addShiftToStaffing(
            shift,
            this.dailyStaffing,
            this.dailyTemplateStaffing,
            date,
        );

        return shift;
    }
}
