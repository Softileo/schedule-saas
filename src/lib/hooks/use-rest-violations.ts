"use client";

import { useMemo, useCallback } from "react";
import type { LocalShift } from "./use-local-shifts";
import type { Employee } from "@/types";
import { getEmployeeFullName } from "@/lib/core/employees/utils";
import { calculateRestHours } from "@/lib/scheduler/scheduler-utils";
import { MIN_DAILY_REST_HOURS } from "@/lib/constants/labor-code";

interface UseRestViolationsProps {
    employees: Employee[];
    activeShifts: LocalShift[];
}

export interface RestViolation {
    employeeName: string;
    date1: string;
    date2: string;
}

/**
 * Hook do wykrywania naruszeń minimalnego 11h odpoczynku między zmianami
 */
export function useRestViolations({
    employees,
    activeShifts,
}: UseRestViolationsProps) {
    // Wykrywanie naruszeń
    const violations = useMemo(() => {
        const result: RestViolation[] = [];

        employees.forEach((emp) => {
            const employeeShifts = activeShifts
                .filter((s) => s.employee_id === emp.id)
                .sort((a, b) => {
                    const dateCompare = a.date.localeCompare(b.date);
                    if (dateCompare !== 0) return dateCompare;
                    return a.end_time.localeCompare(b.end_time);
                });

            for (let i = 0; i < employeeShifts.length - 1; i++) {
                const currentShift = employeeShifts[i];
                const nextShift = employeeShifts[i + 1];

                // Oblicz czas odpoczynku
                const restHours = calculateRestHours(
                    currentShift.date,
                    currentShift.end_time,
                    nextShift.date,
                    nextShift.start_time,
                );

                if (restHours < MIN_DAILY_REST_HOURS) {
                    result.push({
                        employeeName: getEmployeeFullName(emp),
                        date1: currentShift.date,
                        date2: nextShift.date,
                    });
                }
            }
        });

        return result;
    }, [employees, activeShifts]);

    // Check if adding a shift would cause a violation
    const checkViolationForCell = useCallback(
        (
            employeeId: string,
            targetDate: string,
            templateStartTime: string,
            templateEndTime: string,
        ): boolean => {
            const employeeShifts = activeShifts
                .filter((s) => s.employee_id === employeeId)
                .sort((a, b) => {
                    const dateCompare = a.date.localeCompare(b.date);
                    if (dateCompare !== 0) return dateCompare;
                    return a.start_time.localeCompare(b.start_time);
                });

            // Check previous day
            const prevDate = new Date(targetDate);
            prevDate.setDate(prevDate.getDate() - 1);
            const prevDateStr = prevDate.toISOString().split("T")[0];

            const prevDayShift = employeeShifts.find(
                (s) => s.date === prevDateStr,
            );
            if (prevDayShift) {
                const restHours = calculateRestHours(
                    prevDayShift.date,
                    prevDayShift.end_time,
                    targetDate,
                    templateStartTime,
                );

                if (restHours < MIN_DAILY_REST_HOURS) return true;
            }

            // Check next day
            const nextDate = new Date(targetDate);
            nextDate.setDate(nextDate.getDate() + 1);
            const nextDateStr = nextDate.toISOString().split("T")[0];

            const nextDayShift = employeeShifts.find(
                (s) => s.date === nextDateStr,
            );
            if (nextDayShift) {
                const restHours = calculateRestHours(
                    targetDate,
                    templateEndTime,
                    nextDayShift.date,
                    nextDayShift.start_time,
                );

                if (restHours < MIN_DAILY_REST_HOURS) return true;
            }

            return false;
        },
        [activeShifts],
    );

    return {
        violations,
        checkViolationForCell,
    };
}
