import { type EmployeeScheduleState, type GeneratedShift } from "../types";
import {
    getTemplateHours,
    getShiftHours,
    getShiftTimeType,
    daysDiff,
} from "../scheduler-utils";
import type { ShiftTemplate } from "@/types";

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

        const shift: GeneratedShift = {
            employee_id: empId,
            date,
            start_time: template.start_time.substring(0, 5),
            end_time: template.end_time.substring(0, 5),
            break_minutes: template.break_minutes ?? 0,
            template_id: template.id,
        };

        state.shifts.push(shift);
        state.currentHours += hours;
        state.occupiedDates.add(date);

        // Aktualizuj liczniki
        if (this.weekendDaysSet.has(date)) state.weekendShiftCount++;
        if (this.saturdaysSet.has(date)) state.saturdayShiftCount++;
        if (this.tradingSundaysSet.has(date)) state.sundayShiftCount++;

        if (timeType === "morning") state.morningShiftCount++;
        else if (timeType === "afternoon") state.afternoonShiftCount++;
        else state.eveningShiftCount++;

        // Aktualizuj ciągłość
        if (state.lastShiftTemplate?.id === template.id) {
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

        state.lastShiftDate = date;
        state.lastShiftEndTime = template.end_time.substring(0, 5);

        // Aktualizuj struktury obsady
        this.dailyStaffing.get(date)?.push(shift);
        const dayTemplateMap = this.dailyTemplateStaffing.get(date);
        if (dayTemplateMap) {
            let templateStaff = dayTemplateMap.get(template.id);
            if (!templateStaff) {
                templateStaff = [];
                dayTemplateMap.set(template.id, templateStaff);
            }
            templateStaff.push(shift);
        }

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

        if (this.weekendDaysSet.has(shift.date)) state.weekendShiftCount--;
        if (this.saturdaysSet.has(shift.date)) state.saturdayShiftCount--;
        if (this.tradingSundaysSet.has(shift.date)) state.sundayShiftCount--;
        if (timeType === "morning") state.morningShiftCount--;
        else if (timeType === "afternoon") state.afternoonShiftCount--;
        else state.eveningShiftCount--;

        // Usuń z dailyStaffing
        const dayStaff = this.dailyStaffing.get(shift.date);
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
            const dayTemplateMap = this.dailyTemplateStaffing.get(shift.date);
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

        const shift: GeneratedShift = {
            employee_id: empId,
            date,
            start_time: startTime,
            end_time: endTime,
            break_minutes: breakMinutes,
            // Custom shift nie ma template_id
        };

        state.shifts.push(shift);
        state.currentHours += hours;
        state.occupiedDates.add(date);

        // Aktualizuj liczniki
        if (this.weekendDaysSet.has(date)) state.weekendShiftCount++;
        if (this.saturdaysSet.has(date)) state.saturdayShiftCount++;
        if (this.tradingSundaysSet.has(date)) state.sundayShiftCount++;
        if (timeType === "morning") state.morningShiftCount++;
        else if (timeType === "afternoon") state.afternoonShiftCount++;
        else state.eveningShiftCount++;

        // Aktualizuj ciągłość
        state.consecutiveShiftDays = 1;
        state.lastShiftType = timeType;
        state.lastShiftTemplate = null;

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

        state.lastShiftDate = date;
        state.lastShiftEndTime = endTime.substring(0, 5);

        // Aktualizuj struktury obsady
        this.dailyStaffing.get(date)?.push(shift);
        // Nie aktualizujemy dailyTemplateStaffing dla custom shiftów (brak ID)

        return shift;
    }
}
