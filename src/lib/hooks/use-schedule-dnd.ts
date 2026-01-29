"use client";

import { useState, useCallback } from "react";
import {
    DragEndEvent,
    DragStartEvent,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { validateShiftDrop, isSameCell } from "@/lib/core/schedule/validation";
import { createLocalShiftFromTemplate } from "@/lib/core/schedule/shift-factory";
import {
    toastEmployeeAbsence,
    toastNotAssignedToTemplate,
    toastAlreadyWorking,
    toastRestViolation,
    toastHoursComplete,
    toastShiftMoved,
} from "@/lib/core/schedule/toasts";
import { handleShiftValidationError } from "@/lib/utils/shift-validation-handler";
import type { LocalShift } from "./use-local-shifts";
import type {
    Employee,
    ShiftTemplate,
    EmployeeAbsence,
    ShiftTemplateAssignment,
} from "@/types";

interface UseScheduleDnDProps {
    activeShifts: LocalShift[];
    employeeAbsences: EmployeeAbsence[];
    templateAssignments: ShiftTemplateAssignment[];
    employeeHoursMap: Map<string, { scheduled: number; required: number }>;
    scheduleId: string;
    checkRestViolation: (
        employeeId: string,
        date: string,
        startTime: string,
        endTime: string,
    ) => boolean;
    onAddShift: (shift: LocalShift) => void;
    onUpdateShift: (shiftId: string, updates: Partial<LocalShift>) => void;
}

export function useScheduleDnD({
    activeShifts,
    employeeAbsences,
    templateAssignments,
    employeeHoursMap,
    scheduleId,
    checkRestViolation,
    onAddShift,
    onUpdateShift,
}: UseScheduleDnDProps) {
    const [activeEmployee, setActiveEmployee] = useState<Employee | null>(null);
    const [activeShift, setActiveShift] = useState<LocalShift | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 },
        }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 150, tolerance: 5 },
        }),
    );

    const handleDragStart = useCallback((event: DragStartEvent) => {
        const { active } = event;
        if (active.data.current?.type === "employee") {
            setActiveEmployee(active.data.current.employee);
            setActiveShift(null);
        } else if (active.data.current?.type === "shift") {
            setActiveEmployee(active.data.current.employee);
            setActiveShift(active.data.current.shift);
        }
    }, []);

    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event;
            setActiveEmployee(null);
            setActiveShift(null);

            if (!over || !active.data.current || !over.data.current) return;

            // Employee dropped on cell
            if (
                active.data.current.type === "employee" &&
                over.data.current.type === "cell"
            ) {
                const employee = active.data.current.employee as Employee;
                const { date, template } = over.data.current as {
                    date: string;
                    template: ShiftTemplate;
                };

                // Validate drop
                const validationError = validateShiftDrop(
                    employee,
                    date,
                    template,
                    {
                        employeeAbsences,
                        templateAssignments,
                        activeShifts,
                    },
                );

                const shouldCancel = handleShiftValidationError(
                    validationError,
                    employee,
                    {
                        toastEmployeeAbsence,
                        toastNotAssignedToTemplate,
                        toastAlreadyWorking,
                    },
                );

                if (shouldCancel) {
                    return;
                }

                // Check 11h rest violation (warning only, doesn't block)
                const hasViolation = checkRestViolation(
                    employee.id,
                    date,
                    template.start_time,
                    template.end_time,
                );
                if (hasViolation) {
                    toastRestViolation(employee);
                }

                const newShift = createLocalShiftFromTemplate({
                    scheduleId,
                    employeeId: employee.id,
                    date,
                    template,
                });

                onAddShift(newShift);

                const hours = employeeHoursMap.get(employee.id);
                if (hours && hours.scheduled >= hours.required) {
                    toastHoursComplete(
                        employee,
                        hours.scheduled,
                        hours.required,
                    );
                }
            }

            // Shift moved to another cell
            if (
                active.data.current.type === "shift" &&
                over.data.current.type === "cell"
            ) {
                const shift = active.data.current.shift as LocalShift;
                const employee = active.data.current.employee as Employee;
                const { date, template } = over.data.current as {
                    date: string;
                    template: ShiftTemplate;
                };

                // Skip if same cell
                if (isSameCell(shift, date, template)) {
                    return;
                }

                // Validate drop
                const validationError = validateShiftDrop(
                    employee,
                    date,
                    template,
                    {
                        employeeAbsences,
                        templateAssignments,
                        activeShifts,
                        excludeShiftId: shift.id,
                    },
                );

                const shouldCancel = handleShiftValidationError(
                    validationError,
                    employee,
                    {
                        toastEmployeeAbsence,
                        toastNotAssignedToTemplate,
                        toastAlreadyWorking,
                    },
                );

                if (shouldCancel) {
                    return;
                }

                onUpdateShift(shift.id, {
                    date,
                    start_time: template.start_time,
                    end_time: template.end_time,
                    break_minutes: template.break_minutes,
                    color: template.color,
                });

                toastShiftMoved(employee);
            }
        },
        [
            activeShifts,
            employeeAbsences,
            templateAssignments,
            employeeHoursMap,
            scheduleId,
            checkRestViolation,
            onAddShift,
            onUpdateShift,
        ],
    );

    return {
        sensors,
        activeEmployee,
        activeShift,
        handleDragStart,
        handleDragEnd,
    };
}
